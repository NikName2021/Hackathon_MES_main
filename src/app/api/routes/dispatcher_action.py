from datetime import datetime as dt
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from core.config import async_get_db
from database import DispatcherActions, RoleEnum
from helpers import require_admin_or_roles
from schemas import DispatcherActionCreate, DispatcherActionResponse

router = APIRouter(prefix="/dispatcher-actions", tags=["Dispatcher Actions"])


def _parse_date(date_str: str) -> dt:
    """Парсит ISO-строку даты в datetime."""
    s = date_str.strip()
    if len(s) == 5 and ":" in s:  # HH:mm
        today = dt.utcnow().strftime("%Y-%m-%d")
        s = f"{today}T{s}:00"
    return dt.fromisoformat(s.replace("Z", "+00:00"))


@router.post("/", response_model=DispatcherActionResponse)
async def create_dispatcher_action(
        data: DispatcherActionCreate,
        # _: object = Depends(require_admin_or_roles([RoleEnum.dispatcher])),
        db: AsyncSession = Depends(async_get_db),
):
    date_parsed = _parse_date(data.date)
    new_action = DispatcherActions(
        room_id=data.room_id,
        user_id=data.user_id,
        call_sign=data.call_sign,
        action=data.action,
        date=date_parsed,
    )

    db.add(new_action)

    try:
        await db.commit()
        await db.refresh(new_action)
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка при создании записи: {str(e)}",
        )

    return new_action


@router.get("/room/{room_id}", response_model=List[DispatcherActionResponse])
async def get_actions_by_room(
        room_id: str,
        db: AsyncSession = Depends(async_get_db),
):
    """Получение всех записей действий по комнате."""
    query = select(DispatcherActions).where(
        DispatcherActions.room_id == room_id
    ).order_by(DispatcherActions.id.desc())

    result = await db.execute(query)
    actions = result.scalars().all()
    return actions
