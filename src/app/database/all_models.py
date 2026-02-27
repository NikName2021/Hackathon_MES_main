import datetime
from enum import Enum

from pydantic import ConfigDict
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, BigInteger
from sqlalchemy.ext.asyncio import AsyncEngine
from sqlalchemy.orm import declarative_base, relationship

DeclBase = declarative_base()


class Role(str, Enum):
    model_config = ConfigDict(use_enum_values=True)
    USER = "user"
    ADMIN = "admin"
    OPERATOR = "operator"


class User(DeclBase):
    __tablename__ = "user"
    id = Column(Integer, primary_key=True, autoincrement=True)
    telegram_id = Column(BigInteger, nullable=False)
    username = Column(String)
    chat_id = Column(BigInteger, nullable=False)
    notification = Column(Boolean, default=False)
    sub_start = Column(DateTime, default=datetime.datetime.now)
    sub_end = Column(DateTime, default=datetime.datetime.now)
    last_login = Column(DateTime, default=datetime.datetime.now)
    created_date = Column(DateTime, default=datetime.datetime.now)

    settings = relationship("Settings", cascade="all,delete", back_populates="user_main", uselist=False)
    favorites = relationship("Favorites", cascade="all,delete", back_populates="user_main")
    user_refresh_tokens = relationship("IssuedJWTToken", cascade="all,delete", back_populates="user")


class Settings(DeclBase):
    __tablename__ = "settings"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    type_site = Column(Integer, default=1)
    url = Column(Boolean, default=False)

    user_main = relationship("User", back_populates="settings")


class IssuedJWTToken(DeclBase):
    __tablename__ = "issued_jwt_token"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.id"))
    jti = Column(String)
    revoked = Column(Boolean, default=False)
    created_date = Column(DateTime, default=datetime.datetime.now)
    modificated_date = Column(DateTime, default=datetime.datetime.now)

    user = relationship("User", back_populates="user_refresh_tokens")


async def create_tables(engine: AsyncEngine):
    # DeclBase.metadata.create_all()
    async with engine.begin() as conn:
        await conn.run_sync(DeclBase.metadata.create_all)
