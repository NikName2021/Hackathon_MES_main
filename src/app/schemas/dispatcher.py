
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class DispatcherActionCreate(BaseModel):
    room_id: str
    user_id: int
    call_sign: str
    action: str
    date: str


class DispatcherActionResponse(BaseModel):
    id: int
    room_id: str
    user_id: int
    call_sign: str
    action: str
    date: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}