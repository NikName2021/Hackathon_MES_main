from fastapi import APIRouter

from api.routes import user, user_tg

router = APIRouter(prefix="/v1")
router.include_router(user.router)
router.include_router(user_tg.router)
