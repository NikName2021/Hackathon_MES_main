
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class DispatcherActionCreate(BaseModel):
    room_id: str
    user_id: str
    call_sign: str
    action: str
    date: str


class DispatcherActionResponse(BaseModel):
    id: int
    room_id: str
    user_id: str
    call_sign: str
    action: str
    date: str
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True