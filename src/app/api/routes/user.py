from fastapi import APIRouter, HTTPException, status
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import async_get_db
from core.config import logger
from repositories import AuthRepository
from schemas import UserCreate, UserLogin, UserResponse, Token, RefreshTokenRequest
from services import AuthService

router = APIRouter(prefix="/auth", tags=["Авторизация"])


async def get_auth_service(db: AsyncSession = Depends(async_get_db)) -> AuthService:
    repo = AuthRepository(db)
    return AuthService(repo)


@router.post("/register", response_model=UserResponse)
async def register(
        user_data: UserCreate,
        service: AuthService = Depends(get_auth_service)
):
    try:
        logger.info(f"Request to register user: {user_data.email}")

        return await service.register_user(user_data)

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Unexpected error in /register endpoint: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось обработать запрос регистрации"
        )


@router.post("/login", response_model=Token)
async def login(
        user_data: UserLogin,
        service: AuthService = Depends(get_auth_service)
):
    try:
        logger.info(f"Login request for user: {user_data.email}")
        return await service.authenticate_user(user_data)

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Unexpected error in /login endpoint: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось выполнить вход"
        )


@router.post("/token/refresh", response_model=Token)
async def refresh_token(
        request: RefreshTokenRequest,
        service: AuthService = Depends(get_auth_service)
):
    try:
        logger.debug("Token refresh request received")
        return await service.refresh_token(request.refresh_token)

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Unexpected error in endpoint: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось обновить токен"
        )
