from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status
from starlette.responses import JSONResponse

from core.config import async_get_db, logger
from database import User
from helpers import verify_telegram_hash, get_current_user
from services import UserService

router = APIRouter(tags=["user"], prefix="/user")


class TelegramData(BaseModel):
    initData: dict


class FavoriteData(BaseModel):
    league_id: int


class SettingsUpdate(BaseModel):
    type_site: int


@router.post("/auth")
async def authenticate(
        data: TelegramData,
        db: AsyncSession = Depends(async_get_db)
):
    try:
        user_data = verify_telegram_hash(data.initData)
        return await UserService.get_or_create_user(user_data, db)

    except Exception as e:
        logger.error("Произошла ошибка", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing matches: {str(e)}"
        )


@router.get("/favorites")
async def get_favorites(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(async_get_db)
):
    try:
        return await UserService.get_favorites(current_user, db)

    except Exception as e:
        logger.error("Произошла ошибка", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing matches: {str(e)}"
        )


@router.get(
    "/favorite",
)
async def get_leagues_date(
        data: FavoriteData,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(async_get_db)
) -> JSONResponse:
    try:
        return await UserService.check_favorite(current_user, data.league_id, db)
    except Exception as e:
        logger.error("Произошла ошибка", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.put("/favorite")
async def update_favorite(
        data: FavoriteData,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(async_get_db)
) -> JSONResponse:
    try:
        return await UserService.create_delete_favorite(current_user, data.league_id, db)

    except Exception as e:
        logger.error("Произошла ошибка", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing matches: {str(e)}"
        )


@router.get("/settings")
async def get_settings(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(async_get_db)

) -> JSONResponse:
    try:
        return await UserService.get_user_settings(current_user, db)

    except Exception as e:
        logger.error("Произошла ошибка", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing matches: {str(e)}"
        )


@router.post("/settings")
async def update_settings(
        data: SettingsUpdate,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(async_get_db)

) -> JSONResponse:
    try:
        return await UserService.update_user_settings(current_user, data, db)

    except Exception as e:
        logger.error("Произошла ошибка", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing matches: {str(e)}"
        )
