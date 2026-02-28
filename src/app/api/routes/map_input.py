import uuid
from pathlib import Path

from fastapi import HTTPException, Depends
from fastapi import UploadFile, File, APIRouter
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import async_get_db
from database import Room, RoomParams
from schemas import ParamsMapOut, CreateParamsMap, UpdateParamsMap

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".svg"}
MAX_FILE_SIZE = 7 * 1024 * 1024
ROOM_ROLES = ["leader", "analyst", "developer", "tester"]

router = APIRouter(prefix="/room", tags=["Комнаты"])


@router.post("/upload/image")
async def upload_image(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail=f"Файл должен быть изображением. Получен: {file.content_type}"
        )

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Недопустимое расширение '{ext}'. Разрешены: {ALLOWED_EXTENSIONS}"
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Файл слишком большой. Максимум: {MAX_FILE_SIZE // (1024 * 1024)} MB"
        )

    unique_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / unique_filename

    with open(file_path, "wb") as f:
        f.write(content)

    return {
        "filename": unique_filename,
        "original_filename": file.filename,
        "size": len(content),
        "content_type": file.content_type,
        "url": f"/images/{unique_filename}"
    }


@router.post("/room-params", response_model=ParamsMapOut)
async def create_room_params(
        data: CreateParamsMap,
        _: dict = Depends(verify_admin),
        db: AsyncSession = Depends(async_get_db),
):
    """
    Админ задаёт параметры карты для комнаты.
    Вызывается после создания комнаты.
    """

    # 1. Проверяем что комната существует
    result = await db.execute(
        select(Room).where(Room.id == data.room_id)
    )
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Комната не найдена")

    # 2. Проверяем что параметры ещё не заданы
    result = await db.execute(
        select(RoomParams).where(RoomParams.room_id == data.room_id)
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Параметры для этой комнаты уже существуют. "
                   "Используйте PATCH для обновления."
        )

    # 3. Создаём параметры
    params = RoomParams(
        room_id=data.room_id,
        time=data.time,
        wind=data.wind,
        temperature=data.temperature,
        serviceability_water=data.serviceability_water,
    )
    db.add(params)
    await db.commit()
    await db.refresh(params)

    return params



@router.get("/room-params/{room_id}", response_model=ParamsMapOut)
async def get_room_params(
        room_id: str,
        _: dict = Depends(verify_admin),
        db: AsyncSession = Depends(async_get_db),
):
    """Получить параметры карты комнаты."""

    result = await db.execute(
        select(RoomParams).where(RoomParams.room_id == room_id)
    )
    params = result.scalar_one_or_none()

    if not params:
        raise HTTPException(status_code=404, detail="Параметры не найдены")

    return params


# ──────────────────────────────────────
#  ПАРАМЕТРЫ КАРТЫ: обновление
# ──────────────────────────────────────

@router.patch("/room-params/{room_id}", response_model=ParamsMapOut)
async def update_room_params(
        room_id: str,
        data: UpdateParamsMap,
        _: dict = Depends(verify_admin),
        db: AsyncSession = Depends(async_get_db),
):
    """Частично обновить параметры карты."""

    result = await db.execute(
        select(RoomParams).where(RoomParams.room_id == room_id)
    )
    params = result.scalar_one_or_none()

    if not params:
        raise HTTPException(status_code=404, detail="Параметры не найдены")

    # Обновляем только переданные поля
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(params, field, value)

    await db.commit()
    await db.refresh(params)

    return params
