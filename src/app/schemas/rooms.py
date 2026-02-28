from pydantic import BaseModel
from datetime import datetime


class InviteLinkOut(BaseModel):
    role: str
    invite_token: str
    url: str


class RoomCreatedOut(BaseModel):
    room_id: str
    invites: list[InviteLinkOut]


class JoinResponse(BaseModel):
    message: str
    user_id: str
    username: str
    room_id: str
    role: str
    access_token: str
    token_type: str = "bearer"


class RoomStatusOut(BaseModel):
    room_id: str
    room_name: str
    members: list[dict]