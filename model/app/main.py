from __future__ import annotations

from typing import Any, Dict

import numpy as np
import uvicorn
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from shapely.geometry import Polygon, mapping

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


def create_building() -> Polygon:
    """Создаёт сложное демонстрационное здание (как в demo.main())."""
    return create_demo_building_complex()


def create_model(building: Polygon, cfg: FireConfig) -> RasterFireModel:
    """Создаёт экземпляр RasterFireModel с заданной конфигурацией среды."""
    start_pt = (10.0, 1.0)
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

# Глобальное состояние сцены (для демо можно так, в проде лучше использовать
# отдельный слой для управления состоянием/кешем).
BUILDING_POLY: Polygon = create_building()
CURRENT_CONFIG = FireConfig()
MODEL: RasterFireModel = create_model(BUILDING_POLY, CURRENT_CONFIG)


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
    MODEL = create_model(BUILDING_POLY, CURRENT_CONFIG)
    return CURRENT_CONFIG


@router.post("/nozzles", summary="Добавить противопожарный ствол", response_model=FireConfig)
def add_nozzle(nozzle: FireNozzleCfg) -> FireConfig:
    """
    Добавляет новый противопожарный ствол и пересоздаёт модель.
    """
    global CURRENT_CONFIG, MODEL
    CURRENT_CONFIG.nozzles.append(nozzle)
    MODEL = create_model(BUILDING_POLY, CURRENT_CONFIG)
    return CURRENT_CONFIG


@router.delete("/nozzles/{index}", summary="Удалить противопожарный ствол по индексу", response_model=FireConfig)
def delete_nozzle(index: int) -> FireConfig:
    """
    Удаляет противопожарный ствол по индексу и пересоздаёт модель.
    """
    global CURRENT_CONFIG, MODEL
    if 0 <= index < len(CURRENT_CONFIG.nozzles):
        CURRENT_CONFIG.nozzles.pop(index)
        MODEL = create_model(BUILDING_POLY, CURRENT_CONFIG)
    return CURRENT_CONFIG


@router.put("/nozzles/{index}", summary="Обновить противопожарный ствол по индексу", response_model=FireConfig)
def update_nozzle(index: int, nozzle: FireNozzleCfg) -> FireConfig:
    """
    Обновляет противопожарный ствол по индексу и пересоздаёт модель.
    """
    global CURRENT_CONFIG, MODEL
    if 0 <= index < len(CURRENT_CONFIG.nozzles):
        CURRENT_CONFIG.nozzles[index] = nozzle
        MODEL = create_model(BUILDING_POLY, CURRENT_CONFIG)
    return CURRENT_CONFIG


@router.get(
    "/fire",
    summary="Геометрия здания и фронта огня к моменту времени T",
)
def fire_state(time: float = 0.0) -> Dict[str, Any]:
    """
    Возвращает:
      - building: GeoJSON-представление полигона здания.
      - fire: GeoJSON-представление фронта огня (Polygon/MultiPolygon) на момент time.
      - bbox: bounding box расчетной области [minx, miny, maxx, maxy].
      - time: запрошенное время.
      - max_time: максимальное время, которого достигает огонь (по предрасчитанной карте),
                  чтобы фронтенд мог знать, когда огонь "заполнил" всё здание.
    """
    fire_geom = MODEL.get_fire_polygon(time)

    # max_time берём по finite-элементам карты времени
    assert MODEL.time_map is not None
    finite = MODEL.time_map[np.isfinite(MODEL.time_map)]
    max_time = float(finite.max()) if finite.size > 0 else 0.0

    bbox = [MODEL.minx, MODEL.miny, MODEL.maxx, MODEL.maxy]

    return {
        "time": time,
        "max_time": max_time,
        "building": mapping(BUILDING_POLY),
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
