from fastapi import APIRouter

from api.routes import user, room

router = APIRouter(prefix="/v1")
router.include_router(user.router)
router.include_router(room.router)

