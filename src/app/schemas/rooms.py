from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from schemas import Token


class InviteLinkOut(BaseModel):
    role: str
    invite_token: str
    url: str


class InputMapDetails(BaseModel):
    role: str
    invite_token: str
    url: str


class RoomCreatedOut(BaseModel):
    room_id: str


class RoomAddCreated(BaseModel):
    invites: list[InviteLinkOut]

class JoinResponse(BaseModel):
    message: str
    user_id: int
    username: str
    role: str
    room_id: str
    tokens: Token
    token_type: str = "bearer"


class RoomStatusOut(BaseModel):
    room_id: str
    room_name: str
    members: list[dict]


class CreateParamsMap(BaseModel):
    """Входные данные от админа."""
    room_id: str
    time: str
    address: str | None = None
    wind: float = Field(..., ge=0, description="Скорость ветра (м/с)")
    temperature: float = Field(..., description="Температура (°C)")
    serviceability_water: bool = Field(..., description="Исправность водоснабжения")

    model_config = {
        "json_schema_extra": {
            "example": {
                "room_id": "abc123",
                "wind": 5.2,
                "temperature": 22.5,
                "serviceability_water": True,
            }
        }
    }


class ParamsMapOut(BaseModel):
    """Ответ после сохранения."""
    id: str
    room_id: str
    time: str
    address: str | None = None
    wind: float
    temperature: float
    serviceability_water: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UpdateParamsMap(BaseModel):
    """Частичное обновление параметров."""
    time: str | None = None
    address: str | None = None
    wind: float | None = Field(None, ge=0)
    temperature: float | None = None
    serviceability_water: bool | None = None


class RoomObjectsIn(BaseModel):
    """
    Список объектов, приходящий с фронта.
    Храним как есть, без жёсткой схемы.
    """
    objects: list[dict[str, Any]]


class RoomObjectsOut(BaseModel):
    room_id: str
    objects: list[dict[str, Any]]
