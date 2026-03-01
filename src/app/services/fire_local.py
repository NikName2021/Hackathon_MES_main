"""
Локальный (in-process) расчёт распространения огня.
Используется, когда внешний сервис fire-model недоступен — даёт «живой» ответ с building/fire/bbox.
Огонь моделируется как расширяющаяся зона от точки возгорания (пересечение с контуром здания).
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from shapely.geometry import LineString, Point, Polygon, mapping
from shapely.ops import unary_union

# room_id -> (building_polygon, fire_point, speed_units_per_sec)
_room_data: Dict[str, Tuple[Any, Tuple[float, float], float]] = {}

# ═══════════════════════════════════════════════════════════════════════════════
# СКОРОСТЬ РАСПРОСТРАНЕНИЯ ОГНЯ
# Файл: src/app/services/fire_local.py
#
# FIRE_SPEED_BASE — базовая скорость (единиц радиуса в секунду). Меньше = медленнее.
# Типичные значения: 1.0–2.0 (медленно), 3.0–5.0 (средне), 6.0+ (быстро).
# WIND_FACTOR — насколько ветер ускоряет огонь (множитель к скорости).
# ═══════════════════════════════════════════════════════════════════════════════
FIRE_SPEED_BASE = 1.0  # единиц в секунду (радиус расширения) — увеличьте для ускорения
WIND_FACTOR = 0.2    # влияние ветра на скорость (0 = без влияния)


def _get_float(obj: Dict[str, Any], *keys: str, default: float = 0.0) -> float:
    for k in keys:
        if k in obj and obj[k] is not None:
            try:
                return float(obj[k])
            except (TypeError, ValueError):
                pass
    return default


def _canvas_to_building_and_fire(objects: List[Dict[str, Any]]) -> Tuple[Polygon, Tuple[float, float]]:
    """Строит полигон здания и точку очага из объектов канваса (line=стены, rect, circle, fire=очаг)."""
    parts: List[Polygon] = []
    fire_point: Optional[Tuple[float, float]] = None

    for obj in objects or []:
        if not isinstance(obj, dict):
            continue
        typ = obj.get("type")
        if typ == "line":
            x1, y1 = _get_float(obj, "x1"), _get_float(obj, "y1")
            x2, y2 = _get_float(obj, "x2"), _get_float(obj, "y2")
            half = max(_get_float(obj, "strokeWidth", "stroke_width", default=2.0) / 2.0, 0.5)
            line = LineString([(x1, y1), (x2, y2)])
            if line.length >= 1e-6:
                parts.append(line.buffer(half))
        elif typ == "rect":
            x, y = _get_float(obj, "x"), _get_float(obj, "y")
            w = max(_get_float(obj, "width", default=10.0), 1.0)
            h = max(_get_float(obj, "height", default=10.0), 1.0)
            parts.append(Polygon([(x, y), (x + w, y), (x + w, y + h), (x, y + h)]))
        elif typ == "circle":
            cx, cy = _get_float(obj, "x"), _get_float(obj, "y")
            r = max(_get_float(obj, "radius", default=5.0), 0.5)
            parts.append(Point(cx, cy).buffer(r))
        elif typ == "fire":
            fire_point = (_get_float(obj, "x"), _get_float(obj, "y"))

    if not parts:
        if fire_point:
            x, y = fire_point
            pad = 15.0
            parts = [Polygon([(x - pad, y - pad), (x + pad, y - pad), (x + pad, y + pad), (x - pad, y + pad)])]
        else:
            # минимальный дефолт
            parts = [Polygon([(0, 0), (100, 0), (100, 100), (0, 100)])]
            fire_point = (50.0, 50.0)

    building = unary_union(parts)
    if hasattr(building, "geoms") and building.geom_type == "MultiPolygon":
        building = max(building.geoms, key=lambda g: g.area)
    if building.is_empty or not isinstance(building, Polygon):
        building = Polygon([(0, 0), (100, 0), (100, 100), (0, 100)])
    if fire_point is None:
        fire_point = (building.centroid.x, building.centroid.y)
    pt = Point(fire_point[0], fire_point[1])
    if not building.contains(pt):
        fire_point = (building.centroid.x, building.centroid.y)
    return building, fire_point


def init_fire_local(
    room_id: str,
    objects: List[Dict[str, Any]],
    wind_speed: float = 15.0,
    ambient_temperature: float = 40.0,
) -> None:
    """Инициализирует сцену огня для комнаты (здание + очаг). Скорость зависит от FIRE_SPEED_BASE, ветра и температуры."""
    building, fire_point = _canvas_to_building_and_fire(objects)
    # Основная скорость задаётся FIRE_SPEED_BASE выше; ветер и температура дают небольшой множитель
    speed = FIRE_SPEED_BASE * (1.0 + wind_speed * 0.02) * (1.0 + (ambient_temperature - 20) * 0.01)
    speed = max(speed, 0.5)
    _room_data[room_id] = (building, fire_point, speed)


def get_fire_state_local(room_id: str, time: float) -> Optional[Dict[str, Any]]:
    """
    Возвращает состояние огня в момент time (секунды): building, fire, bbox, time, max_time.
    Огонь = расширяющийся круг от очага, обрезанный по зданию (в реальном времени).
    """
    if room_id not in _room_data:
        return None
    building, fire_point, speed = _room_data[room_id]
    minx, miny, maxx, maxy = building.bounds
    bbox = [minx, miny, maxx, maxy]
    # радиус огня растёт со временем
    radius = max(0.0, time) * speed
    if radius <= 0:
        fire_geom = Point(fire_point).buffer(0.01)
    else:
        fire_geom = Point(fire_point[0], fire_point[1]).buffer(radius).intersection(building)
    if fire_geom.is_empty:
        fire_geom = Point(fire_point).buffer(0.01)
    # max_time — ориентировочно, когда огонь покроет здание (радиус ~ диагональ bbox)
    diag = ((maxx - minx) ** 2 + (maxy - miny) ** 2) ** 0.5
    max_time = max(1.0, diag / speed) if speed > 0 else 1.0
    return {
        "time": time,
        "max_time": max_time,
        "building": mapping(building),
        "fire": mapping(fire_geom) if not fire_geom.is_empty else None,
        "bbox": bbox,
    }
