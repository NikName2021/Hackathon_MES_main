from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from api.routes.user import get_auth_service
from core.config import async_get_db
from core.ws_manager import manager
from database import Invite, User
from schemas import JoinResponse
from services import AuthService


router = APIRouter(tags=["Invite"], prefix="/invite")


@router.get("/room", response_model=JoinResponse)
async def join_room(
        invite_token: str,
        username: str = Query(..., description="Имя пользователя"),
        db: AsyncSession = Depends(async_get_db),
        service: AuthService = Depends(get_auth_service)
):
    """
    Пользователь переходит по invite-ссылке.
    Указывает своё имя → получает JWT-токен и роль в комнате.
    """

    result = await db.execute(
        select(Invite).where(Invite.token == invite_token)
    )
    invite = result.scalar_one_or_none()

    if not invite:
        raise HTTPException(status_code=404, detail="Ссылка не найдена")

    if invite.is_used:
        raise HTTPException(status_code=400, detail="Ссылка уже использована")

    # 2. Создаём пользователя
    user = User(
        username=username,
        room_id=invite.room_id,
        role=invite.role,
    )
    db.add(user)
    await db.flush()

    invite.is_used = True
    # invite.user_id = user.id

    await db.commit()

    # 4. Считаем сколько уже в комнате
    count_result = await db.execute(
        select(func.count()).select_from(Invite).where(
            Invite.room_id == invite.room_id,
            Invite.is_used == True,
        )
    )
    members_count = count_result.scalar()

    await manager.notify_player_joined(
        room_id=invite.room_id,
        user_id=user.id,
        username=username,
        role=invite.role.value,
        members_count=members_count,
    )

    if members_count >= 4:
        await manager.notify_room_full(invite.room_id)

    tokens = await service.generate_user_token({
        "sub": user.id,
        "username": user.username,
        "room_id": user.room_id,
        "role": user.role.value,
    })

    return JoinResponse(
        message=f"Добро пожаловать, {username}! Вы — {invite.role.value}",
        user_id=user.id,
        username=user.username,
        role=invite.role.value,
        tokens=tokens,
    )

# @router.get("/me")
# async def get_me(
#     current_user: dict = Depends(
#         __import__("auth", fromlist=["get_current_user"]).get_current_user
#     ),
# ):
#     """Проверка токена — кто я."""
#     return {
#         "user_id": current_user["sub"],
#         "username": current_user["username"],
#         "room_id": current_user["room_id"],
#         "role": current_user["role"],
#     }
