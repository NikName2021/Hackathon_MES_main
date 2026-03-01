from __future__ import annotations

import json
from typing import Any, Dict, Optional, Tuple

import numpy as np
import uvicorn
from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from shapely import from_geojson
from shapely.geometry import LineString, Polygon, Point, mapping
from shapely.ops import unary_union

from demo import FireNozzle, RasterFireModel, create_demo_building_complex


class FireNozzleCfg(BaseModel):
    """Конфигурация одного противопожарного ствола."""

    x: float
    y: float
    radius: float
    efficiency: float
    direction_deg: float = 0.0
    angle_width_deg: float = 60.0


class FireConfig(BaseModel):
    """Конфигурация среды для модели распространения огня и тушения."""

    speed: float = 1.0
    cell_size: float = 0.25
    ambient_temperature: float = 40.0
    reference_temperature: float = 20.0
    temperature_sensitivity: float = 0.03
    wind_speed: float = 15.0
    wind_direction_deg: float = 0.0
    wind_influence: float = 0.3
    nozzles: list[FireNozzleCfg] = []


class StartPoint(BaseModel):
    x: float
    y: float


class SceneInit(BaseModel):
    """Инициализация сцены огня для комнаты: здание + очаг + параметры среды."""

    room_id: str
    building: Optional[Dict[str, Any]] = None  # GeoJSON Polygon/MultiPolygon
    start_point: Optional[StartPoint] = None
    objects: Optional[list[Dict[str, Any]]] = None  # объекты канваса: line, rect, circle, fire
    speed: float = 1.0
    cell_size: float = 0.25
    ambient_temperature: float = 40.0
    reference_temperature: float = 20.0
    temperature_sensitivity: float = 0.03
    wind_speed: float = 15.0
    wind_direction_deg: float = 0.0
    wind_influence: float = 0.3
    nozzles: list[FireNozzleCfg] = []


def _geojson_to_polygon(geojson: Dict[str, Any]) -> Polygon:
    """Преобразует GeoJSON Polygon или MultiPolygon в Shapely Polygon (внешний контур)."""
    if not geojson or geojson.get("type") not in ("Polygon", "MultiPolygon"):
        raise ValueError("building must be GeoJSON Polygon or MultiPolygon")
    geom = from_geojson(json.dumps(geojson))
    if geom.geom_type == "MultiPolygon":
        geom = max(geom.geoms, key=lambda g: g.area)
    if geom.geom_type != "Polygon":
        raise ValueError("Expected Polygon or MultiPolygon")
    return geom


def _safe_float(obj: Dict[str, Any], key: str, default: float = 0.0) -> float:
    """Безопасное извлечение числа из объекта (поддержка строк из JSON)."""
    v = obj.get(key)
    if v is None and key != "strokeWidth":
        v = obj.get(key.replace("_", ""))  # strokeWidth vs strokeWidth
    if v is None:
        return default
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def _get_float(obj: Dict[str, Any], *keys: str, default: float = 0.0) -> float:
    """Первый существующий ключ из keys (поддержка camelCase и snake_case)."""
    for k in keys:
        if k in obj and obj[k] is not None:
            try:
                return float(obj[k])
            except (TypeError, ValueError):
                pass
    return default


def _canvas_objects_to_building_and_fire(
    objects: list[Dict[str, Any]],
) -> Tuple[Polygon, Tuple[float, float]]:
    """
    Конвертирует объекты канваса в полигон здания и точку очага.
    - line — стены (отрезок буферизуется в тонкий полигон).
    - rect, circle — стены/помещения.
    - fire — точка возгорания (очаг).
    """
    parts: list[Polygon] = []
    fire_point: Optional[Tuple[float, float]] = None
    line_buffer = 2.0  # толщина стены для линий (в тех же единицах, что и координаты)

    for obj in (objects or []):
        if not isinstance(obj, dict):
            continue
        typ = obj.get("type")
        if typ == "line":
            x1 = _get_float(obj, "x1", default=0.0)
            y1 = _get_float(obj, "y1", default=0.0)
            x2 = _get_float(obj, "x2", default=0.0)
            y2 = _get_float(obj, "y2", default=0.0)
            sw = _get_float(obj, "strokeWidth", "stroke_width", default=2.0)
            half = max(sw / 2.0, 0.5)
            line = LineString([(x1, y1), (x2, y2)])
            if line.length < 1e-6:
                continue
            parts.append(line.buffer(half))
        elif typ == "rect":
            x = _get_float(obj, "x", default=0.0)
            y = _get_float(obj, "y", default=0.0)
            w = _get_float(obj, "width", default=10.0)
            h = _get_float(obj, "height", default=10.0)
            if w <= 0:
                w = 10.0
            if h <= 0:
                h = 10.0
            parts.append(Polygon([(x, y), (x + w, y), (x + w, y + h), (x, y + h)]))
        elif typ == "circle":
            cx = _get_float(obj, "x", default=0.0)
            cy = _get_float(obj, "y", default=0.0)
            r = max(_get_float(obj, "radius", default=5.0), 0.5)
            parts.append(Point(cx, cy).buffer(r))
        elif typ == "fire":
            fire_point = (_get_float(obj, "x", default=0.0), _get_float(obj, "y", default=0.0))

    if not parts:
        # Нет контура здания — делаем небольшой полигон вокруг очага или дефолтный
        if fire_point:
            x, y = fire_point
            pad = 15.0
            parts = [Polygon([(x - pad, y - pad), (x + pad, y - pad), (x + pad, y + pad), (x - pad, y + pad)])]
        else:
            return create_building(), (10.0, 1.0)

    building = unary_union(parts)
    if building.geom_type == "MultiPolygon":
        building = max(building.geoms, key=lambda g: g.area)
    if building.geom_type != "Polygon" or building.is_empty:
        return create_building(), (10.0, 1.0)

    if fire_point is None:
        fire_point = (building.centroid.x, building.centroid.y)
    # Проверяем, что очаг внутри здания; иначе берём центр
    pt = Point(fire_point[0], fire_point[1])
    if not building.contains(pt):
        fire_point = (building.centroid.x, building.centroid.y)

    return building, fire_point


def create_building() -> Polygon:
    """Создаёт сложное демонстрационное здание (как в demo.main())."""
    return create_demo_building_complex()


def create_model(building: Polygon, start_pt: tuple[float, float], cfg: FireConfig) -> RasterFireModel:
    """Создаёт экземпляр RasterFireModel с заданной конфигурацией среды."""
    nozzles: list[FireNozzle] = [
        FireNozzle(
            x=n.x,
            y=n.y,
            radius=n.radius,
            efficiency=n.efficiency,
            direction_deg=n.direction_deg,
            angle_width_deg=n.angle_width_deg,
        )
        for n in cfg.nozzles
    ]
    return RasterFireModel(
        building_polygon=building,
        start_point=start_pt,
        speed=cfg.speed,
        cell_size=cfg.cell_size,
        ambient_temperature=cfg.ambient_temperature,
        reference_temperature=cfg.reference_temperature,
        temperature_sensitivity=cfg.temperature_sensitivity,
        wind_speed=cfg.wind_speed,
        wind_direction_deg=cfg.wind_direction_deg,
        wind_influence=cfg.wind_influence,
        nozzles=nozzles,
    )


router = APIRouter(prefix="/calculate_fire", tags=["Модель огня"])

# Глобальное состояние сцены (для демо без room_id).
BUILDING_POLY: Polygon = create_building()
CURRENT_CONFIG = FireConfig()
MODEL: RasterFireModel = create_model(BUILDING_POLY, (10.0, 1.0), CURRENT_CONFIG)

# По комнатам: room_id -> (building_polygon, config, model)
ROOM_MODELS: Dict[str, Tuple[Polygon, FireConfig, RasterFireModel]] = {}


@router.get("/health", summary="Проверка работоспособности сервиса")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@router.get("/config", summary="Текущая конфигурация среды", response_model=FireConfig)
def get_config() -> FireConfig:
    return CURRENT_CONFIG


@router.post("/config", summary="Обновить конфигурацию среды", response_model=FireConfig)
def update_config(cfg: FireConfig) -> FireConfig:
    """
    Обновляет параметры среды (ветер, температуры, базовая скорость и т.п.)
    и пересоздаёт модель пожара с новой конфигурацией.
    """
    global CURRENT_CONFIG, MODEL
    CURRENT_CONFIG = cfg
    MODEL = create_model(BUILDING_POLY, (10.0, 1.0), CURRENT_CONFIG)
    return CURRENT_CONFIG


@router.post("/scene", summary="Инициализация сцены огня для комнаты (здание + очаг + параметры)")
def init_scene(data: SceneInit) -> Dict[str, str]:
    """
    Устанавливает здание (GeoJSON или из objects), точку возгорания и параметры среды для комнаты.
    После вызова GET /fire?room_id=...&time=... возвращает состояние огня для этой комнаты.
    Если передан objects (канвас: line, rect, circle, fire), здание и очаг строятся из них.
    """
    if data.objects:
        building, start_pt = _canvas_objects_to_building_and_fire(data.objects)
    elif data.building and data.start_point:
        building = _geojson_to_polygon(data.building)
        start_pt = (data.start_point.x, data.start_point.y)
    else:
        building = create_building()
        start_pt = (10.0, 1.0)
    cfg = FireConfig(
        speed=data.speed,
        cell_size=data.cell_size,
        ambient_temperature=data.ambient_temperature,
        reference_temperature=data.reference_temperature,
        temperature_sensitivity=data.temperature_sensitivity,
        wind_speed=data.wind_speed,
        wind_direction_deg=data.wind_direction_deg,
        wind_influence=data.wind_influence,
        nozzles=data.nozzles,
    )
    model = create_model(building, start_pt, cfg)
    ROOM_MODELS[data.room_id] = (building, cfg, model)
    return {"status": "ok", "room_id": data.room_id}


@router.post("/nozzles", summary="Добавить противопожарный ствол", response_model=FireConfig)
def add_nozzle(nozzle: FireNozzleCfg) -> FireConfig:
    """
    Добавляет новый противопожарный ствол и пересоздаёт модель.
    """
    global CURRENT_CONFIG, MODEL
    CURRENT_CONFIG.nozzles.append(nozzle)
    MODEL = create_model(BUILDING_POLY, (10.0, 1.0), CURRENT_CONFIG)
    return CURRENT_CONFIG


@router.delete("/nozzles/{index}", summary="Удалить противопожарный ствол по индексу", response_model=FireConfig)
def delete_nozzle(index: int) -> FireConfig:
    """
    Удаляет противопожарный ствол по индексу и пересоздаёт модель.
    """
    global CURRENT_CONFIG, MODEL
    if 0 <= index < len(CURRENT_CONFIG.nozzles):
        CURRENT_CONFIG.nozzles.pop(index)
        MODEL = create_model(BUILDING_POLY, (10.0, 1.0), CURRENT_CONFIG)
    return CURRENT_CONFIG


@router.put("/nozzles/{index}", summary="Обновить противопожарный ствол по индексу", response_model=FireConfig)
def update_nozzle(index: int, nozzle: FireNozzleCfg) -> FireConfig:
    """
    Обновляет противопожарный ствол по индексу и пересоздаёт модель.
    """
    global CURRENT_CONFIG, MODEL
    if 0 <= index < len(CURRENT_CONFIG.nozzles):
        CURRENT_CONFIG.nozzles[index] = nozzle
        MODEL = create_model(BUILDING_POLY, (10.0, 1.0), CURRENT_CONFIG)
    return CURRENT_CONFIG


@router.get(
    "/fire",
    summary="Геометрия здания и фронта огня к моменту времени T",
)
def fire_state(
    time: float = 0.0,
    room_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Возвращает:
      - building: GeoJSON-представление полигона здания.
      - fire: GeoJSON-представление фронта огня (Polygon/MultiPolygon) на момент time.
      - bbox: bounding box расчетной области [minx, miny, maxx, maxy].
      - time: запрошенное время.
      - max_time: максимальное время, которого достигает огонь (по предрасчитанной карте),
                  чтобы фронтенд мог знать, когда огонь "заполнил" всё здание.
    Если передан room_id, используется модель, инициализированная через POST /scene.
    """
    if room_id and room_id in ROOM_MODELS:
        building_poly, _cfg, model = ROOM_MODELS[room_id]
    else:
        building_poly = BUILDING_POLY
        model = MODEL

    fire_geom = model.get_fire_polygon(time)

    assert model.time_map is not None
    finite = model.time_map[np.isfinite(model.time_map)]
    max_time = float(finite.max()) if finite.size > 0 else 0.0

    bbox = [model.minx, model.miny, model.maxx, model.maxy]

    return {
        "time": time,
        "max_time": max_time,
        "building": mapping(building_poly),
        "fire": mapping(fire_geom) if not fire_geom.is_empty else None,
        "bbox": bbox,
    }


app = FastAPI(title="Raster Fire Simulation API")
app.include_router(router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    uvicorn.run(app, host='0.0.0.0', port=7000)
