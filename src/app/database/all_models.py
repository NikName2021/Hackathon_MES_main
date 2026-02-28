import datetime
import uuid
from enum import Enum

from sqlalchemy import (
    Column, String, DateTime, ForeignKey, Boolean, Enum as SAEnum, Integer, Float
)
from sqlalchemy.ext.asyncio import AsyncEngine
from sqlalchemy.orm import declarative_base, relationship

DeclBase = declarative_base()


# class RoleEnum(str, Enum):
#     dispatcher = "Диспетчер"
#     rtp = "РТП"
#     headquarters = "штаб"
#     by1 = "БУ1"
#     by2 = "БУ2"


class RoleEnum(str, Enum):
    leader = "leader"
    analyst = "analyst"
    developer = "developer"
    tester = "tester"




class Room(DeclBase):
    __tablename__ = "rooms"

    id = Column(String, primary_key=True, default=lambda: uuid.uuid4().hex)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    invites = relationship("Invite", back_populates="room", cascade="all, delete-orphan")
    params = relationship("RoomParams", back_populates="room", uselist=False,
                          cascade="all, delete-orphan")
    room_map = relationship("RoomMap", back_populates="room", uselist=False,
                            cascade="all, delete-orphan")


class Invite(DeclBase):
    __tablename__ = "invites"

    id = Column(String, primary_key=True, default=lambda: uuid.uuid4().hex)
    token = Column(String, unique=True, nullable=False, index=True,
                   default=lambda: uuid.uuid4().hex)
    room_id = Column(String, ForeignKey("rooms.id"), nullable=False)
    role = Column(SAEnum(RoleEnum), nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    room = relationship("Room", back_populates="invites")
    user = relationship("User", back_populates="invite")


class User(DeclBase):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String, nullable=False)
    room_id = Column(String, ForeignKey("rooms.id"), nullable=False)
    role = Column(SAEnum(RoleEnum), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    invite = relationship("Invite", back_populates="user", uselist=False)
    user_refresh_tokens = relationship("UserIssuedJWTToken", cascade="all,delete", back_populates="user_tk")


class UserIssuedJWTToken(DeclBase):
    __tablename__ = "user_issued_jwt_token"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user = Column(Integer, ForeignKey("users.id"))
    jti = Column(String)
    revoked = Column(Boolean, default=False)
    created_date = Column(DateTime, default=datetime.datetime.now)
    modificated_date = Column(DateTime, default=datetime.datetime.now)

    user_tk = relationship("User", back_populates="user_refresh_tokens")


class AdminIssuedJWTToken(DeclBase):
    __tablename__ = "admin_issued_jwt_token"
    id = Column(Integer, primary_key=True, autoincrement=True)
    admin_id = Column(Integer, ForeignKey("admin.id"))
    jti = Column(String)
    revoked = Column(Boolean, default=False)
    created_date = Column(DateTime, default=datetime.datetime.now)
    modificated_date = Column(DateTime, default=datetime.datetime.now)

    admin = relationship("Admin", back_populates="admin_refresh_tokens")


class Admin(DeclBase):
    __tablename__ = "admin"
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String)
    hashed_password = Column(String, nullable=False)
    last_login = Column(DateTime, default=datetime.datetime.now)
    created_date = Column(DateTime, default=datetime.datetime.now)

    admin_refresh_tokens = relationship("AdminIssuedJWTToken", cascade="all,delete", back_populates="admin")


class RoomParams(DeclBase):
    __tablename__ = "room_params"

    id = Column(String, primary_key=True, default=lambda: uuid.uuid4().hex)
    room_id = Column(String, ForeignKey("rooms.id"), unique=True, nullable=False)

    time = Column(DateTime, nullable=False)
    wind = Column(Float, nullable=False)
    temperature = Column(Float, nullable=False)
    serviceability_water = Column(Boolean, nullable=False)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    room = relationship("Room", back_populates="params")


class RoomMap(DeclBase):
    """Одна карта на комнату. После добавления изменить нельзя."""
    __tablename__ = "room_maps"

    id = Column(String, primary_key=True, default=lambda: uuid.uuid4().hex)
    room_id = Column(String, ForeignKey("rooms.id"), unique=True, nullable=False)
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    content_type = Column(String, nullable=False)
    size = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    room = relationship("Room", back_populates="room_map")

async def create_tables(engine: AsyncEngine):
    # DeclBase.metadata.create_all()
    async with engine.begin() as conn:
        await conn.run_sync(DeclBase.metadata.create_all)
