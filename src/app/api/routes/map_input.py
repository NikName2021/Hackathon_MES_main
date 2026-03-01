import uuid
from datetime import datetime, date
from pathlib import Path

from fastapi import HTTPException, Depends
from fastapi import UploadFile, File, APIRouter
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import JSONResponse

from core.config import async_get_db
from database import Room, RoomParams, RoomMap, RoomObjects
from helpers import require_admin, require_admin_or_any_user
from schemas import ParamsMapOut, CreateParamsMap, UpdateParamsMap, RoomObjectsIn, RoomObjectsOut

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".svg"}
MAX_FILE_SIZE = 7 * 1024 * 1024

router = APIRouter(prefix="/room_params", tags=["Параметры комнаты"])


def _parse_time_to_datetime(value: str):
    """Преобразует строку 'HH:MM' или 'HH:MM:SS' в datetime (дата 2000-01-01)."""
    value = (value or "").strip()
    for fmt in ("%H:%M:%S", "%H:%M"):
        try:
            t = datetime.strptime(value, fmt).time()
            return datetime.combine(date(2000, 1, 1), t)
        except ValueError:
            continue
    raise ValueError(f"Недопустимый формат времени: {value!r}")


def _format_time_from_datetime(value):
    """Форматирует datetime или time в строку HH:MM для ответа API."""
    if value is None:
        return ""
    if hasattr(value, "strftime"):
        return value.strftime("%H:%M")
    return str(value)


@router.post("/{room_id}/map")
async def add_room_map(
        room_id: str,
        file: UploadFile = File(...),
        _: object = Depends(require_admin),
        db: AsyncSession = Depends(async_get_db),
):
    """
    Добавить карту к комнате. Только админ. Одна карта на комнату, изменить нельзя.
    """
    result = await db.execute(select(Room).where(Room.id == room_id))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Комната не найдена")

    result = await db.execute(select(RoomMap).where(RoomMap.room_id == room_id))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Карта для этой комнаты уже добавлена. Изменить нельзя."
        )

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Файл должен быть изображением")

    ext = Path(file.filename or "").suffix.lower()
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
    file_path.write_bytes(content)

    room_map = RoomMap(
        room_id=room_id,
        filename=unique_filename,
        original_filename=file.filename or "map",
        content_type=file.content_type,
        size=len(content),
    )
    db.add(room_map)
    await db.commit()
    await db.refresh(room_map)

    return {
        "id": room_map.id,
        "room_id": room_map.room_id,
        "filename": room_map.filename,
        "original_filename": room_map.original_filename,
        "size": room_map.size,
        "content_type": room_map.content_type,
        "url": f"/room/{room_id}/map",
    }


@router.get("/{room_id}/map")
async def get_room_map(
        room_id: str,
        _: object = Depends(require_admin_or_any_user),
        db: AsyncSession = Depends(async_get_db),
):
    """Получить карту комнаты по room_id."""
    result = await db.execute(select(RoomMap).where(RoomMap.room_id == room_id))
    room_map = result.scalar_one_or_none()
    if not room_map:
        raise HTTPException(status_code=404, detail="Карта не найдена")

    file_path = UPLOAD_DIR / room_map.filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Файл карты не найден на диске")

    return FileResponse(
        path=file_path,
        media_type=room_map.content_type,
        filename=room_map.original_filename,
    )


@router.get("/{room_id}/map/info")
async def get_room_map_info(
        room_id: str,
        _: object = Depends(require_admin_or_any_user),
        db: AsyncSession = Depends(async_get_db),
):
    """Получить метаданные карты (без скачивания файла)."""
    result = await db.execute(select(RoomMap).where(RoomMap.room_id == room_id))
    room_map = result.scalar_one_or_none()
    if not room_map:
        raise HTTPException(status_code=404, detail="Карта не найдена")

    return {
        "id": room_map.id,
        "room_id": room_map.room_id,
        "filename": room_map.filename,
        "original_filename": room_map.original_filename,
        "size": room_map.size,
        "content_type": room_map.content_type,
        "url": f"/room/{room_id}/map",
    }


# ──────────────────────────────────────
#  СПИСОК ОБЪЕКТОВ КОМНАТЫ
# ──────────────────────────────────────


@router.post("/{room_id}/objects", response_model=RoomObjectsOut)
async def save_room_objects(
        room_id: str,
        data: RoomObjectsIn,
        _: object = Depends(require_admin),
        db: AsyncSession = Depends(async_get_db),
):
    """
    Принять список объектов с фронта и сохранить по комнате.
    Если запись уже есть — перезаписываем payload.
    """
    # Убедимся, что комната существует
    result = await db.execute(select(Room).where(Room.id == room_id))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Комната не найдена")

    result = await db.execute(select(RoomObjects).where(RoomObjects.room_id == room_id))
    existing = result.scalar_one_or_none()

    if existing:
        existing.payload = data.objects
        await db.commit()
        await db.refresh(existing)
        obj = existing
    else:
        obj = RoomObjects(
            room_id=room_id,
            payload=data.objects,
        )
        db.add(obj)
        await db.commit()
        await db.refresh(obj)

    return RoomObjectsOut(
        room_id=room_id,
        objects=obj.payload,
    )


@router.get("/{room_id}/objects", response_model=RoomObjectsOut)
async def get_room_objects(
        room_id: str,
        # _: object = Depends(require_admin_or_any_user),
        db: AsyncSession = Depends(async_get_db),
):
    """
    Отдать список объектов по id комнаты.
    Если данных ещё нет — вернём пустой список.
    """
    result = await db.execute(select(RoomObjects).where(RoomObjects.room_id == room_id))
    obj = result.scalar_one_or_none()

    if not obj:
        return RoomObjectsOut(room_id=room_id, objects=[])

    return RoomObjectsOut(
        room_id=room_id,
        objects=obj.payload,
    )


# ──────────────────────────────────────
#  ПАРАМЕТРЫ КАРТЫ: создание
# ──────────────────────────────────────

@router.post("/room-params", response_model=ParamsMapOut)
async def create_room_params(
        data: CreateParamsMap,
        _: object = Depends(require_admin),
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

    # 3. Создаём параметры (time в БД — timestamp, с фронта приходит строка "HH:MM")
    time_dt = _parse_time_to_datetime(data.time)
    params = RoomParams(
        room_id=data.room_id,
        time=time_dt,
        address=data.address if data.address is not None else None,
        wind=data.wind,
        temperature=data.temperature,
        serviceability_water=data.serviceability_water,
    )
    db.add(params)
    await db.commit()
    await db.refresh(params)

    return JSONResponse(content={"status": "success"})


@router.get("/room-params/{room_id}", response_model=ParamsMapOut)
async def get_room_params(
        room_id: str,
        # _: object = Depends(require_admin),
        db: AsyncSession = Depends(async_get_db),
):
    """Получить параметры карты комнаты."""

    result = await db.execute(
        select(RoomParams).where(RoomParams.room_id == room_id)
    )
    params = result.scalar_one_or_none()

    if not params:
        raise HTTPException(status_code=404, detail="Параметры не найдены")

    return ParamsMapOut(
        id=params.id,
        room_id=params.room_id,
        time=_format_time_from_datetime(params.time),
        address=getattr(params, "address", None),
        wind=params.wind,
        temperature=params.temperature,
        serviceability_water=params.serviceability_water,
        created_at=params.created_at,
        updated_at=params.updated_at,
    )


@router.patch("/room-params/{room_id}", response_model=ParamsMapOut)
async def update_room_params(
        room_id: str,
        data: UpdateParamsMap,
        _: object = Depends(require_admin),
        db: AsyncSession = Depends(async_get_db),
):
    """Частично обновить параметры карты."""

    result = await db.execute(
        select(RoomParams).where(RoomParams.room_id == room_id)
    )
    params = result.scalar_one_or_none()

    if not params:
        raise HTTPException(status_code=404, detail="Параметры не найдены")

    # Обновляем только переданные поля (time — строка "HH:MM" -> datetime)
    update_data = data.model_dump(exclude_unset=True)
    if "time" in update_data:
        update_data["time"] = _parse_time_to_datetime(update_data["time"])
    for field, value in update_data.items():
        setattr(params, field, value)

    await db.commit()
    await db.refresh(params)

    return ParamsMapOut(
        id=params.id,
        room_id=params.room_id,
        time=_format_time_from_datetime(params.time),
        address=getattr(params, "address", None),
        wind=params.wind,
        temperature=params.temperature,
        serviceability_water=params.serviceability_water,
        created_at=params.created_at,
        updated_at=params.updated_at,
    )
