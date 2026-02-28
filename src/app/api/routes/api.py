from fastapi import APIRouter

from api.routes import user, room, invite, map_input

router = APIRouter(prefix="/v1")
router.include_router(user.router)
router.include_router(room.router)
router.include_router(map_input.router)
router.include_router(invite.router)

