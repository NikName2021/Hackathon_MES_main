import datetime
import json
from pathlib import Path

from fastapi import APIRouter, Body, Depends
from fastapi import HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.orm.attributes import flag_modified
from starlette.websockets import WebSocket, WebSocketDisconnect

from core.config import async_get_db, BASE_URL, sessionmaker
from core.ws_manager import manager
from database import User, Room, Invite, RoleEnum, Admin, RoomState
from helpers import require_admin, require_admin_or_any_user
from schemas.rooms import RoomCreatedOut, InviteLinkOut, RoomStatusOut, RoomAddCreated

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".svg"}
MAX_FILE_SIZE = 7 * 1024 * 1024
ROOM_ROLES = ["dispatcher", "rtp", "headquarters", "by1", "by2"]
# ROOM_ROLES = ["leader", "analyst", "developer", "tester"]

router = APIRouter(prefix="/room", tags=["Комнаты"])


@router.get("/create-room", response_model=RoomCreatedOut)
async def create_room(
        current_user: Admin = Depends(require_admin),
        db: AsyncSession = Depends(async_get_db)

):
    """
    Админ создаёт комнату.
    """
    room = Room()
    db.add(room)

    await db.commit()

    return RoomCreatedOut(
        room_id=room.id,
    )


@router.get("/add_users/{room_id}", response_model=RoomAddCreated)
async def get_room_status(
        room_id: str,
        current_user: Admin = Depends(require_admin),
        db: AsyncSession = Depends(async_get_db)

):
    """
    Админ создаёт комнату.
    Автоматически генерируются 4 invite-ссылки (по одной на каждую роль).
    """

    result = await db.execute(
        select(Room)
        .where(Room.id == room_id)
    )
    room = result.scalar_one_or_none()

    if not room:
        raise HTTPException(status_code=404, detail="Комната не найдена")

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

    # Запуск таймера комнаты при нажатии «Сохранить» — виден всем ролям
    state_result = await db.execute(select(RoomState).where(RoomState.room_id == room_id))
    state_row = state_result.scalar_one_or_none()
    raw = state_row.payload if state_row and state_row.payload is not None else {}
    payload = dict(raw) if isinstance(raw, dict) else {}
    payload["timer_started_at"] = datetime.datetime.utcnow().isoformat(timespec="milliseconds") + "Z"
    if state_row:
        state_row.payload = payload
        flag_modified(state_row, "payload")
    else:
        db.add(RoomState(room_id=room.id, payload=payload))

    await db.commit()

    return RoomAddCreated(
        invites=invites_out,
    )



@router.get("/{room_id}/timer")
async def get_room_timer(
        room_id: str,
        db: AsyncSession = Depends(async_get_db),
):
    """
    Время старта таймера комнаты. Без авторизации — таймер видят все участники.
    """
    room_result = await db.execute(select(Room).where(Room.id == room_id))
    room = room_result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Комната не найдена")
    state_result = await db.execute(select(RoomState).where(RoomState.room_id == room_id))
    state_row = state_result.scalar_one_or_none()
    payload = state_row.payload if state_row and state_row.payload else {}
    return {"room_id": room_id, "timer_started_at": payload.get("timer_started_at")}


@router.get("/{room_id}/simulation-state")
async def get_simulation_state(
        room_id: str,
        db: AsyncSession = Depends(async_get_db),
):
    """
    Состояние симуляции для игровой механики: таймер и высылка техники диспетчером.
    Без авторизации — доступно всем ролям.
    """
    room_result = await db.execute(select(Room).where(Room.id == room_id))
    room = room_result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Комната не найдена")
    state_result = await db.execute(select(RoomState).where(RoomState.room_id == room_id))
    state_row = state_result.scalar_one_or_none()
    raw = state_row.payload if state_row and state_row.payload is not None else {}
    payload = dict(raw) if isinstance(raw, dict) else {}
    dispatches = payload.get("dispatcher_dispatches")
    if not isinstance(dispatches, list):
        dispatches = []
    headquarters_created = bool(payload.get("headquarters_created"))
    combat_sections_added = int(payload.get("combat_sections_added", 0))
    if combat_sections_added < 0:
        combat_sections_added = 0
    if combat_sections_added > 2:
        combat_sections_added = 2
    return {
        "room_id": room_id,
        "timer_started_at": payload.get("timer_started_at"),
        "dispatcher_dispatches": dispatches,
        "headquarters_created": headquarters_created,
        "combat_sections_added": combat_sections_added,
    }


@router.post("/{room_id}/rtp-create-headquarters")
async def post_rtp_create_headquarters(
        room_id: str,
        db: AsyncSession = Depends(async_get_db),
):
    """РТП нажал «Создание штаба» — разблокируем интерфейс Штаба."""
    room_result = await db.execute(select(Room).where(Room.id == room_id))
    room = room_result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Комната не найдена")
    state_result = await db.execute(select(RoomState).where(RoomState.room_id == room_id))
    state_row = state_result.scalar_one_or_none()
    raw = state_row.payload if state_row and state_row.payload is not None else {}
    payload = dict(raw) if isinstance(raw, dict) else {}
    payload["headquarters_created"] = True
    if state_row:
        state_row.payload = payload
        flag_modified(state_row, "payload")
    else:
        db.add(RoomState(room_id=room_id, payload=payload))
    await db.commit()
    return {"ok": True, "headquarters_created": True}


@router.post("/{room_id}/headquarters-add-combat-section")
async def post_headquarters_add_combat_section(
        room_id: str,
        db: AsyncSession = Depends(async_get_db),
):
    """Штаб нажал «Добавить боевые участки» — первый раз разблокируем БУ1, второй раз БУ2."""
    room_result = await db.execute(select(Room).where(Room.id == room_id))
    room = room_result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Комната не найдена")
    state_result = await db.execute(select(RoomState).where(RoomState.room_id == room_id))
    state_row = state_result.scalar_one_or_none()
    raw = state_row.payload if state_row and state_row.payload is not None else {}
    payload = dict(raw) if isinstance(raw, dict) else {}
    current = int(payload.get("combat_sections_added", 0))
    if current < 0:
        current = 0
    if current >= 2:
        return {"ok": True, "combat_sections_added": 2}
    payload["combat_sections_added"] = current + 1
    if state_row:
        state_row.payload = payload
        flag_modified(state_row, "payload")
    else:
        db.add(RoomState(room_id=room_id, payload=payload))
    await db.commit()
    return {"ok": True, "combat_sections_added": current + 1}


@router.post("/{room_id}/dispatcher-dispatch")
async def post_dispatcher_dispatch(
        room_id: str,
        body: dict = Body(...),
        db: AsyncSession = Depends(async_get_db),
):
    """
    Диспетчер отправил технику: добавляем запись в высылку (Время след., мин. и момент отправки).
    """
    room_result = await db.execute(select(Room).where(Room.id == room_id))
    room = room_result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Комната не найдена")
    vehicle_id = body.get("vehicleId") or body.get("vehicle_id")
    vehicle_name = body.get("vehicleName") or body.get("vehicle_name") or ""
    count = int(body.get("count", 0))
    eta_minutes = int(body.get("etaMinutes") or body.get("eta_minutes") or 0)
    if count < 1 or eta_minutes < 1:
        raise HTTPException(status_code=400, detail="count и etaMinutes должны быть больше 0")
    sent_at = datetime.datetime.utcnow().isoformat(timespec="milliseconds") + "Z"
    state_result = await db.execute(select(RoomState).where(RoomState.room_id == room_id))
    state_row = state_result.scalar_one_or_none()
    raw = state_row.payload if state_row and state_row.payload is not None else {}
    payload = dict(raw) if isinstance(raw, dict) else {}
    dispatches = list(payload.get("dispatcher_dispatches") or [])
    dispatches.append({
        "vehicleId": vehicle_id,
        "vehicleName": vehicle_name,
        "count": count,
        "etaMinutes": eta_minutes,
        "sentAt": sent_at,
    })
    payload["dispatcher_dispatches"] = dispatches
    if state_row:
        state_row.payload = payload
        flag_modified(state_row, "payload")
    else:
        db.add(RoomState(room_id=room_id, payload=payload))
    await db.commit()
    return {"ok": True, "sent_at": sent_at}


@router.get("/{room_id}/state")
async def get_room_state(
        room_id: str,
        current_user: User | Admin = Depends(require_admin_or_any_user),
        db: AsyncSession = Depends(async_get_db),
):
    """
    Текущее состояние сцены комнаты (из БД).
    Для восстановления сцены при перезагрузке страницы или повторном входе.
    """
    room_result = await db.execute(select(Room).where(Room.id == room_id))
    room = room_result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Комната не найдена")

    state_result = await db.execute(select(RoomState).where(RoomState.room_id == room_id))
    state_row = state_result.scalar_one_or_none()
    return {"room_id": room_id, "state": state_row.payload if state_row else {}}


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
            data = await websocket.receive_text()

            if data == "ping":
                await websocket.send_json({"event": "pong"})

    except WebSocketDisconnect:
        manager.disconnect_admin(websocket, room_id)


# ──────────────────────────────────────
#  WebSocket для игроков: синхронизация сцены
# ──────────────────────────────────────


@router.websocket("/ws/game/{room_id}")
async def game_room_websocket(
        websocket: WebSocket,
        room_id: str,
):
    """
    Игрок подключается к комнате. При изменении сцены на фронте шлёт scene_update —
    состояние сохраняется в БД и рассылается остальным игрокам (и админам) в комнате.

    Сообщения от клиента (JSON):
      - {"event": "scene_update", "data": { ... }} — новое состояние сцены (сохраняем и рассылаем)
      - "ping" — ответ "pong"

    Сообщения клиенту:
      - {"event": "scene_state", "data": { ... }} — при подключении (текущее состояние из БД)
      - {"event": "scene_update", "data": { ... }} — обновление от другого игрока
    """
    async with sessionmaker() as db:
        room_result = await db.execute(select(Room).where(Room.id == room_id))
        room = room_result.scalar_one_or_none()
        if not room:
            await websocket.close(code=4404, reason="Room not found")
            return

        state_result = await db.execute(select(RoomState).where(RoomState.room_id == room_id))
        state_row = state_result.scalar_one_or_none()
        initial_payload = state_row.payload if state_row else {}

    await manager.connect_player(websocket, room_id)
    await websocket.send_json({"event": "scene_state", "data": initial_payload})

    try:
        while True:
            raw = await websocket.receive_text()
            if raw == "ping":
                await websocket.send_json({"event": "pong"})
                continue

            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            if msg.get("event") == "scene_update":
                data = msg.get("data")
                if data is None:
                    data = {}
                if not isinstance(data, dict):
                    continue

                async with sessionmaker() as session:
                    st = await session.execute(select(RoomState).where(RoomState.room_id == room_id))
                    row = st.scalar_one_or_none()
                    if row:
                        row.payload = data
                    else:
                        row = RoomState(room_id=room_id, payload=data)
                        session.add(row)
                    await session.commit()

                await manager.broadcast_scene_update(room_id, data, exclude_websocket=websocket)

    except WebSocketDisconnect:
        manager.disconnect_player(websocket, room_id)
