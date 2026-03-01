"""
Клиент для сервиса модели распространения огня (calculate_fire).
Используется при нажатии «Сохранить» в параметрах комнаты и для проксирования состояния огня.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

import aiohttp

from core.config import FIRE_MODEL_URL


def _normalize_canvas_objects(raw_objects: List[Any]) -> List[Dict[str, Any]]:
    """
    Приводит объекты из БД к виду, ожидаемому моделью огня:
    тип + координаты (line: x1,y1,x2,y2; rect: x,y,width,height; circle/fire: x,y,radius).
    """
    out: List[Dict[str, Any]] = []
    for item in raw_objects or []:
        if not isinstance(item, dict):
            continue
        obj = dict(item)
        typ = obj.get("type")
        if not typ or typ not in ("line", "rect", "circle", "fire"):
            continue
        # гарантируем числовые поля (могут прийти строками из JSON)
        normalized = {"type": str(typ)}
        for key in ("x", "y", "x1", "y1", "x2", "y2", "width", "height", "radius", "strokeWidth"):
            if key in obj and obj[key] is not None:
                try:
                    normalized[key] = float(obj[key])
                except (TypeError, ValueError):
                    normalized[key] = 0.0
        out.append(normalized)
    return out


async def init_fire_scene(
    room_id: str,
    objects: List[Dict[str, Any]],
    wind_speed: float = 15.0,
    ambient_temperature: float = 40.0,
    base_url: Optional[str] = None,
) -> bool:
    """
    Инициализирует сцену огня для комнаты: передаёт объекты канваса и параметры среды.
    Возвращает True при успехе, False при ошибке или недоступности сервиса.
    """
    url = (base_url or FIRE_MODEL_URL).rstrip("/")
    objects_clean = _normalize_canvas_objects(objects)
    payload = {
        "room_id": room_id,
        "objects": objects_clean,
        "wind_speed": float(wind_speed),
        "ambient_temperature": float(ambient_temperature),
        "speed": 1.0,
        "cell_size": 0.25,
        "reference_temperature": 20.0,
        "temperature_sensitivity": 0.03,
        "wind_direction_deg": 0.0,
        "wind_influence": 0.3,
        "nozzles": [],
    }
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{url}/calculate_fire/scene", json=payload, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                if resp.status in (200, 201):
                    return True
                return False
    except Exception:
        return False


async def get_fire_state(room_id: str, time: float, base_url: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Запрашивает состояние огня у сервиса модели для комнаты room_id в момент времени time (секунды).
    Возвращает dict с ключами building, fire, bbox, time, max_time или None при ошибке.
    """
    url = (base_url or FIRE_MODEL_URL).rstrip("/")
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{url}/calculate_fire/fire",
                params={"room_id": room_id, "time": round(time, 2)},
                timeout=aiohttp.ClientTimeout(total=10),
            ) as resp:
                if resp.status == 200:
                    return await resp.json()
                return None
    except Exception:
        return None
