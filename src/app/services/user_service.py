import jwt
from fastapi import HTTPException, status
from core.config import SECRET_KEY, ALGORITHM
from database import User, RoleEnum, AdminIssuedJWTToken, Admin
from helpers import hash_password, verify_password, create_access_token, create_refresh_token
from schemas import UserCreate, UserLogin, Token, UserResponse
from repositories import AuthRepository


class AuthService:
    def __init__(self, repo: AuthRepository):
        self.repo = repo

    # async def register_user(self, user_data: UserCreate) -> User:
    #     existing_user = await self.repo.get_user_by_email_or_username(
    #         user_data.username
    #     )
    #     if existing_user:
    #         if existing_user.email == user_data.email:
    #             raise HTTPException(status_code=400, detail="Email уже зарегистрирован")
    #         raise HTTPException(status_code=400, detail="Username уже занят")
    #
    #     new_user = User(
    #         email=user_data.email,
    #         username=user_data.username,
    #         hashed_password=hash_password(user_data.password),
    #         role=Role.USER
    #     )
    #     return await self.repo.create_user(new_user)

    async def authenticate_user(self, user_data: UserLogin) -> Token:
        admin = await self.repo.get_admin_by_username(user_data.username)

        """Артемка, Левка и Мишка не бейте( 
        В следующих коммитах поменяем"""
        if not admin or user_data.password != admin.hashed_password:

        # if not user or not verify_password(user_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Неверный username или пароль",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return await self._generate_tokens(admin)

    async def refresh_token(self, refresh_token_str: str) -> Token:
        try:
            payload = jwt.decode(refresh_token_str, SECRET_KEY, algorithms=[ALGORITHM])
        except jwt.PyJWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Недействительный refresh token"
            )

        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Это не refresh token"
            )

        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Некорректный токен")

        token_obj = await self.repo.get_valid_refresh_token(refresh_token_str, user_id)
        if not token_obj:
            raise HTTPException(status_code=401, detail="Refresh token отозван или истёк")

        user = await self.repo.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="Пользователь не найден")

        return await self._generate_tokens(user)

    async def _generate_tokens(self, admin: Admin) -> Token:
        payload = {"user_id": admin.id, "role": "admin"}

        access_token = create_access_token(payload)
        refresh_token = create_refresh_token(payload)

        token_obj = AdminIssuedJWTToken(
            admin_id=admin.id,
            jti=refresh_token
        )
        await self.repo.save_token(token_obj)

        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserResponse.model_validate(admin)
        )