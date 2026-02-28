from pathlib import Path

from fastapi import APIRouter, Depends
from fastapi import HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from starlette.websockets import WebSocket, WebSocketDisconnect

from core.config import async_get_db, BASE_URL
from core.ws_manager import manager
from database import User, Room, Invite, RoleEnum, Admin
from helpers import require_admin, require_admin_or_any_user
from schemas.rooms import RoomCreatedOut, InviteLinkOut, RoomStatusOut

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".svg"}
MAX_FILE_SIZE = 7 * 1024 * 1024
# ROOM_ROLES = ["dispatcher", "rtp", "headquarters", "by1", "by2"]
ROOM_ROLES = ["leader", "analyst", "developer", "tester"]

router = APIRouter(prefix="/room", tags=["Комнаты"])


@router.get("/create-room", response_model=RoomCreatedOut)
async def create_room(
        current_user: Admin = Depends(require_admin),
        db: AsyncSession = Depends(async_get_db)

):
    """
    Админ создаёт комнату.
    Автоматически генерируются 4 invite-ссылки (по одной на каждую роль).
    """
    room = Room()
    db.add(room)
    await db.flush()

    invites_out = []
    for role_name in ROOM_ROLES:
        role_value = getattr(RoleEnum, role_name)
        invite = Invite(
            room_id=room.id,
            role=role_value
        )
        db.add(invite)
        await db.flush()

        invites_out.append(InviteLinkOut(
            role=role_name,
            invite_token=invite.token,
            url=f"{BASE_URL}/join/{invite.token}",
        ))

    await db.commit()

    return RoomCreatedOut(
        room_id=room.id,
        invites=invites_out,
    )


@router.get("/rooms/{room_id}", response_model=RoomStatusOut)
async def get_room_status(
        room_id: str,
        current_user: User | Admin = Depends(require_admin_or_any_user),
        db: AsyncSession = Depends(async_get_db)
):
    """Посмотреть состояние комнаты: кто присоединился."""

    result = await db.execute(
        select(Room)
        .options(selectinload(Room.invites))
        .where(Room.id == room_id)
    )
    room = result.scalar_one_or_none()

    if not room:
        raise HTTPException(status_code=404, detail="Комната не найдена")

    members = []
    for inv in room.invites:
        members.append({
            "role": inv.role.value,
            "is_used": inv.is_used,
            "user_id": inv.user_id,
            "invite_token": inv.token,
        })

    return RoomStatusOut(
        room_id=room.id,
        members=members,
    )


@router.websocket("/ws/room/{room_id}")
async def admin_room_websocket(
        websocket: WebSocket,
        room_id: str,
        token: str = Query(default=""),
        db: AsyncSession = Depends(async_get_db)
):
    """
    WebSocket для админа.
    Подключение: ws://localhost:8000/admin/ws/room/{room_id}?token=admin-secret-token
""eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJyb2xlIjoiYWRtaW4iLCJleHAiOjE3NzIyODE2OTB9.qjtscLtnXdTa3B686TLwBrH-JIo2u97NmBCA44miy8U"
    Админ получает события в реальном времени:
    - player_joined
    - room_full
    """
    result = await db.execute(
        select(Room).options(selectinload(Room.invites)).where(Room.id == room_id)
    )
    room = result.scalar_one_or_none()

    if not room:
        await websocket.close(code=4004, reason="Room not found")
        return

    # 3. Подключаем админа
    await manager.connect_admin(websocket, room_id)

    # 4. Отправляем текущее состояние комнаты
    members = []
    for inv in room.invites:
        members.append({
            "role": inv.role.value,
            "is_used": inv.is_used,
            "user_id": inv.user_id,
        })

    await websocket.send_json({
        "event": "room_state",
        "data": {
            "room_id": room.id,
            "members": members,
            "members_count": sum(1 for m in members if m["is_used"]),
            "total": 4,
        }
    })
    try:
        while True:
            # Ждём сообщения от админа (ping/pong или команды)
            data = await websocket.receive_text()

            if data == "ping":
                await websocket.send_json({"event": "pong"})

    except WebSocketDisconnect:
        manager.disconnect_admin(websocket, room_id)
