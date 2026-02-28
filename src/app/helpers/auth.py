from datetime import datetime, timedelta
from typing import Union

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import pwd_context, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, async_get_db, security, \
    REFRESH_TOKEN_EXPIRE_DAYS
from database import User, RoleEnum, Admin


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, str(SECRET_KEY), algorithm=ALGORITHM)


def create_refresh_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, str(SECRET_KEY), algorithm=ALGORITHM)

def decode_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, str(SECRET_KEY), algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


async def get_current_user(
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: AsyncSession = Depends(async_get_db)
) -> Admin:
    """Получить текущего авторизованного пользователя (только Admin)."""
    auth = await get_authenticated(credentials, db)
    if not isinstance(auth, Admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Требуется авторизация администратора"
        )
    return auth


async def get_authenticated(
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: AsyncSession = Depends(async_get_db)
) -> Union[Admin, User]:
    """
    Получить текущего авторизованного пользователя (Admin или User).
    Определяет тип по payload: admin (user_id + role=admin) или user (sub).
    """
    token = credentials.credentials
    payload = decode_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный токен"
        )

    # Admin: {"user_id": id, "role": "admin"}
    if payload.get("role") == "admin":
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный токен")
        result = await db.execute(select(Admin).where(Admin.id == user_id))
        admin = result.scalar_one_or_none()
        if not admin:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Админ не найден")
        return admin

    # User: {"sub": id, "username", "room_id", "role"}
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный токен")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Пользователь не найден")
    return user


def require_admin(auth: Union[Admin, User] = Depends(get_authenticated)) -> Admin:
    """Только админ."""
    if not isinstance(auth, Admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Доступ только для администратора")
    return auth


def require_admin_or_any_user(auth: Union[Admin, User] = Depends(get_authenticated)) -> Union[Admin, User]:
    """Админ или любой пользователь."""
    return auth


def require_admin_or_roles(allowed_roles: list[RoleEnum]):
    """
    Админ или пользователь с одной из указанных ролей.
    Использование: Depends(require_admin_or_roles([RoleEnum.leader, RoleEnum.analyst]))
    """

    def _check(auth: Union[Admin, User] = Depends(get_authenticated)) -> Union[Admin, User]:
        if isinstance(auth, Admin):
            return auth
        if auth.role in allowed_roles:
            return auth
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Доступ запрещён. Требуется роль: {[r.value for r in allowed_roles]}"
        )

    return _check


# Алиас для обратной совместимости
verify_admin = require_admin


class RoleChecker:
    """Проверка ролей пользователя. Админ всегда допускается."""

    def __init__(self, allowed_roles: list[RoleEnum], allow_admin: bool = True):
        self.allowed_roles = allowed_roles
        self.allow_admin = allow_admin

    def __call__(self, auth: Union[Admin, User] = Depends(get_authenticated)) -> Union[Admin, User]:
        if isinstance(auth, Admin) and self.allow_admin:
            return auth
        if isinstance(auth, User) and auth.role in self.allowed_roles:
            return auth
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Доступ запрещён. Требуется роль: {[r.value for r in self.allowed_roles]}"
        )
