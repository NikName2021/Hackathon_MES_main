from __future__ import annotations

from dataclasses import dataclass, field
import heapq
from math import ceil, cos, hypot, radians, sin, sqrt
from typing import List, Sequence, Tuple, Union

import matplotlib.pyplot as plt
import numpy as np
from shapely.geometry import MultiPolygon, Point, Polygon
from shapely.ops import unary_union
from skimage import draw, measure


Number = Union[int, float]


@dataclass
class FireNozzle:
    """
    Противопожарный ствол.

    x, y          — координаты установки (в мировых координатах модели).
    radius        — радиус эффективного действия (в тех же единицах, что и здание).
    efficiency    — коэффициент эффективности тушения (0..1):
                    чем больше, тем быстрее распространяется зона тушения.
    direction_deg — направление потока воды в градусах:
                    0° = вдоль +X (вправо), 90° = вдоль +Y (вверх).
    angle_width_deg — ширина сектора действия в градусах (например, 60° означает ±30° от направления).
    """

    x: float
    y: float
    radius: float
    efficiency: float
    direction_deg: float = 0.0
    angle_width_deg: float = 60.0


def _rect(x1: float, y1: float, x2: float, y2: float) -> Polygon:
    """Вспомогательная функция: осевой прямоугольник как Polygon."""
    return Polygon([(x1, y1), (x2, y1), (x2, y2), (x1, y2)])


def _create_sector(
    center_x: float,
    center_y: float,
    radius: float,
    direction_deg: float,
    angle_width_deg: float,
    num_points: int = 32,
) -> Polygon:
    """
    Создаёт полигон сектора (часть круга) с заданным направлением и углом распыления.
    
    Args:
        center_x, center_y: центр сектора (позиция ствола)
        radius: радиус действия
        direction_deg: направление потока воды в градусах (0° = вдоль +X)
        angle_width_deg: ширина сектора в градусах
        num_points: количество точек для аппроксимации дуги
    
    Returns:
        Polygon сектора
    """
    if radius <= 0:
        return Point(center_x, center_y).buffer(0.01)  # минимальный полигон
    
    # Половина угла сектора
    half_angle = angle_width_deg / 2.0
    
    # Начальный и конечный углы в радианах
    start_angle_rad = radians(direction_deg - half_angle)
    end_angle_rad = radians(direction_deg + half_angle)
    
    # Создаём точки на дуге окружности
    points: List[Tuple[float, float]] = [(center_x, center_y)]  # начинаем с центра
    
    # Если сектор полный (360°), создаём полный круг
    if angle_width_deg >= 360:
        for i in range(num_points + 1):
            angle = 2 * np.pi * i / num_points
            x = center_x + radius * cos(angle)
            y = center_y + radius * sin(angle)
            points.append((x, y))
    else:
        # Добавляем точки на дуге от start_angle до end_angle
        for i in range(num_points + 1):
            # Интерполируем угол от start_angle до end_angle
            t = i / num_points
            angle = start_angle_rad + t * (end_angle_rad - start_angle_rad)
            x = center_x + radius * cos(angle)
            y = center_y + radius * sin(angle)
            points.append((x, y))
    
    # Замыкаем полигон (последняя точка = первая)
    return Polygon(points)


def create_demo_building_complex() -> Polygon:
    """
    Создаёт более сложное здание для демонстрации:
    несколько «комнат» и коридоров, соединённых между собой.

    Строим здание как объединение набора прямоугольников (комнат/коридоров).
    Все прямоугольники пересекаются или касаются, поэтому итоговая геометрия
    представляет собой один связный полигон с разветвлённой планировкой.
    """
    # Горизонтальные коридоры
    parts: List[Polygon] = [
        _rect(0.0, 0.0, 40.0, 6.0),   # нижний длинный коридор
        _rect(0.0, 12.0, 40.0, 18.0), # средний коридор
        _rect(0.0, 24.0, 40.0, 30.0), # верхний коридор

        # Вертикальные соединяющие части
        _rect(0.0, 0.0, 6.0, 30.0),    # левый вертикальный блок
        _rect(17.0, 0.0, 23.0, 18.0),  # центральный вертикальный блок (низ + середина)
        _rect(34.0, 12.0, 40.0, 30.0), # правый вертикальный блок (середина + верх)

        # «Комнаты» вокруг центрального коридора
        _rect(6.0, 6.0, 17.0, 12.0),   # нижняя левая комната
        _rect(23.0, 6.0, 34.0, 12.0),  # нижняя правая комната
        _rect(6.0, 18.0, 17.0, 24.0),  # верхняя левая комната
        _rect(23.0, 18.0, 34.0, 24.0), # верхняя правая комната
    ]

    building = unary_union(parts)

    # На всякий случай: если получилось несколько несвязных кусков, возьмём
    # самый крупный. Но по конструкции всё должно быть связно.
    if isinstance(building, MultiPolygon):
        building = max(building.geoms, key=lambda g: g.area)

    assert isinstance(building, Polygon)
    return building


@dataclass
class RasterFireModel:
    """
    Растровая модель распространения огня внутри полигона здания.

    Пайплайн:
    1. Растеризация здания на регулярную сетку (ячеки = воздух, вне = стена).
    2. Предрасчет карты времени прихода огня (алгоритм Дейкстры по 8 направлениям).
    3. Для заданного T: бинарная маска, Marching Squares, обратное преобразование
       в мировые координаты и обрезка по исходному полигону здания.
    """

    building_polygon: Polygon
    start_point: Union[Point, Tuple[Number, Number]]
    speed: float                      # базовая скорость распространения при опорной температуре и без ветра
    cell_size: float
    nozzles: List[FireNozzle] = field(default_factory=list)

    # Параметры окружающей среды
    ambient_temperature: float = 20.0       # текущая температура воздуха, °C
    reference_temperature: float = 20.0     # опорная температура, при которой speed = базовая скорость
    temperature_sensitivity: float = 0.03   # относительное изменение скорости на 1 °C (например, 0.03 = +3% за градус)

    # Параметры ветра
    wind_speed: float = 0.0                 # скорость ветра (в условных единицах, согласованных с моделью)
    wind_direction_deg: float = 0.0         # направление ветра в градусах: 0° = вдоль +X, 90° = вдоль +Y
    wind_influence: float = 0.3             # насколько сильно ветер влияет на скорость (масштабный коэффициент)

    # Поля, которые заполняются при предрасчёте
    grid_mask: np.ndarray | None = None          # True = проходимая ячейка (внутри здания)
    time_map: np.ndarray | None = None           # Время прихода огня (без учёта факта, что он уже потушен)
    ext_time_map: np.ndarray | None = None       # Время прихода фронта тушения (минимум по всем стволам)
    minx: float | None = None
    miny: float | None = None
    maxx: float | None = None
    maxy: float | None = None
    height: int | None = None                    # количество строк сетки
    width: int | None = None                     # количество столбцов сетки

    def __post_init__(self) -> None:
        # Нормализуем стартовую точку к Shapely Point
        if not isinstance(self.start_point, Point):
            sx, sy = self.start_point  # type: ignore[misc]
            self.start_point = Point(float(sx), float(sy))

        if self.speed <= 0:
            raise ValueError("Скорость распространения огня должна быть > 0")
        if self.cell_size <= 0:
            raise ValueError("Размер ячейки (cell_size) должен быть > 0")

        self._precompute_time_map()

    # ------------------------------------------------------------------
    # Вспомогательные преобразования координат
    # ------------------------------------------------------------------
    def _world_to_grid_indices(self, x: float, y: float) -> Tuple[int, int]:
        """
        Перевод мировых координат (x, y) -> индексы матрицы (row, col).

        Матрица имеет размер (height, width) и покрывает bounding box здания:
          - по оси X: [minx, maxx)
          - по оси Y: [miny, maxy)

        Каждая ячейка имеет размер cell_size.

        row (строка) растет вниз, поэтому:
          row = floor((y - miny) / cell_size)
          col = floor((x - minx) / cell_size)
        """
        assert self.minx is not None and self.miny is not None

        col = int((x - self.minx) // self.cell_size)
        row = int((y - self.miny) // self.cell_size)
        return row, col

    def _grid_indices_to_world_center(self, row: int, col: int) -> Tuple[float, float]:
        """
        Перевод индексов матрицы (row, col) -> координаты центра ячейки в мировых координатах.

        Ячейка (row, col) занимает в мировых координатах прямоугольник:
            x ∈ [minx + col * cell_size,     minx + (col + 1) * cell_size)
            y ∈ [miny + row * cell_size,     miny + (row + 1) * cell_size)

        Центр ячейки:
            x_c = minx + (col + 0.5) * cell_size
            y_c = miny + (row + 0.5) * cell_size
        """
        assert self.minx is not None and self.miny is not None

        x_c = self.minx + (col + 0.5) * self.cell_size
        y_c = self.miny + (row + 0.5) * self.cell_size
        return x_c, y_c

    def _grid_coords_to_world(self, row: float, col: float) -> Tuple[float, float]:
        """
        Перевод непрерывных координат решетки (row, col), которые возвращает
        `skimage.measure.find_contours`, в мировые координаты.

        Контуры Marching Squares проходят вдоль границ ячеек. Если считать,
        что решетка задает систему координат с шагом 1 по осям (col, row),
        то точка с координатами (row, col) соответствует мировой точке:

            x = minx + col * cell_size
            y = miny + row * cell_size

        Здесь (row, col) могут быть нецелыми (линия между центрами ячеек).
        """
        assert self.minx is not None and self.miny is not None

        x = self.minx + col * self.cell_size
        y = self.miny + row * self.cell_size
        return x, y

    # ------------------------------------------------------------------
    # Предрасчёт: растеризация и карта времени
    # ------------------------------------------------------------------
    def _precompute_time_map(self) -> None:
        """
        Построение растровой сетки и карт времени:
          - time_map:   время прихода огня;
          - ext_time_map: время прихода фронта тушения от стволов.

        Оба поля рассчитываются на одной и той же регулярной сетке.
        """
        # 1. Bounding box здания
        self.minx, self.miny, self.maxx, self.maxy = self.building_polygon.bounds

        # Безопасно немного расширим bbox, чтобы избежать граничных эффектов
        pad = self.cell_size
        self.minx -= pad
        self.miny -= pad
        self.maxx += pad
        self.maxy += pad

        # 2. Размеры сетки (ceil, чтобы полностью покрыть bbox)
        width = ceil((self.maxx - self.minx) / self.cell_size)
        height = ceil((self.maxy - self.miny) / self.cell_size)
        self.width = width
        self.height = height

        # 3. Растеризация полигона здания в индексовое пространство (col, row)
        #    Сначала переводим координаты вершин полигона в координаты решетки:
        #      col = (x - minx) / cell_size
        #      row = (y - miny) / cell_size
        exterior = np.asarray(self.building_polygon.exterior.coords)
        xs = exterior[:, 0]
        ys = exterior[:, 1]

        cols = (xs - self.minx) / self.cell_size
        rows = (ys - self.miny) / self.cell_size

        rr, cc = draw.polygon(rows, cols, shape=(height, width))

        # grid_mask[row, col] = True, если центр ячейки внутри здания (доступный воздух)
        grid_mask = np.zeros((height, width), dtype=bool)
        grid_mask[rr, cc] = True
        self.grid_mask = grid_mask

        # 4. Подготовка параметров среды (температура)
        # ------------------------------------------------------------------
        # Температурный множитель: чем выше температура относительно опорной,
        # тем быстрее распространяется огонь по всем направлениям.
        #
        #     v_T = speed * (1 + k_T * (T - T_ref))
        #
        temp_factor = 1.0 + self.temperature_sensitivity * (
            self.ambient_temperature - self.reference_temperature
        )
        # Гарантируем положительность эффективной скорости
        temp_factor = max(temp_factor, 1e-3)
        base_speed_env = self.speed * temp_factor

        # 5. Карта времени прихода фронта тушения (если заданы стволы)
        # ------------------------------------------------------------------
        self.ext_time_map = self._compute_extinguish_time_map(
            base_speed_env=base_speed_env,
            height=height,
            width=width,
            grid_mask=grid_mask,
        )

        # Нормированный вектор направления ветра (единичной длины).
        # Ветер задается в декартовой системе координат здания:
        #   0°   → вдоль +X (вправо),
        #   90°  → вдоль +Y (вверх).
        if self.wind_speed > 0.0:
            theta = radians(self.wind_direction_deg)
            wind_vec_x = cos(theta)
            wind_vec_y = sin(theta)
        else:
            wind_vec_x = 0.0
            wind_vec_y = 0.0

        # 6. Инициализация карты времени для огня
        time_map = np.full((height, width), np.inf, dtype=float)

        # Стартовая ячейка для очага возгорания
        sx, sy = self.start_point.x, self.start_point.y  # type: ignore[assignment]
        start_row, start_col = self._world_to_grid_indices(sx, sy)

        if not (0 <= start_row < height and 0 <= start_col < width):
            raise ValueError("Стартовая точка находится вне bounding box здания")
        if not grid_mask[start_row, start_col]:
            raise ValueError("Стартовая точка попала в стену (вне полигона здания)")

        time_map[start_row, start_col] = 0.0

        # 7. Алгоритм Дейкстры по 8 направлениям для огня
        # ------------------------------------------------------------------
        # Базовые геометрические расстояния между центрами соседних ячеек:
        #   - ортогональные соседи: dist = cell_size
        #   - диагональные соседи: dist = cell_size * sqrt(2)
        #
        # Но реальное время шага зависит от эффективной скорости вдоль
        # конкретного направления:
        #
        #   v_eff = v_T * f_wind
        #
        # где f_wind усиливает скорость "по ветру" и ослабляет "против ветра":
        #
        #   f_wind = 1 + k_w * |V_wind| * cos(phi),
        #
        #   phi — угол между направлением распространения огня и вектором ветра,
        #   cos(phi) = 1  → строго по ветру  (максимальное ускорение),
        #   cos(phi) = -1 → строго против   (максимальное замедление).
        #
        # Время шага:
        #
        #   dt = dist / v_eff
        #
        neighbors: List[Tuple[int, int, float, float, float]] = []
        for drow, dcol in [
            (0, 1),   # вправо
            (1, 0),   # вниз
            (0, -1),  # влево
            (-1, 0),  # вверх
            (1, 1),   # диагонали
            (-1, -1),
            (1, -1),
            (-1, 1),
        ]:
            # Геометрическое расстояние между центрами соседних ячеек
            grid_len = sqrt(float(drow * drow + dcol * dcol))  # 1 или sqrt(2)
            dist = self.cell_size * grid_len

            # Направление распространения в мировых координатах.
            # Ось X соответствует столбцу (col), ось Y — строке (row).
            # Берем единичный вектор (ux, uy) для расчета cos(phi) с ветром.
            ux = float(dcol) / grid_len
            uy = float(drow) / grid_len

            neighbors.append((drow, dcol, dist, ux, uy))

        # Очередь с приоритетом: (время, row, col)
        pq: List[Tuple[float, int, int]] = [(0.0, start_row, start_col)]

        while pq:
            t, row, col = heapq.heappop(pq)

            # Если в очереди лежит устаревшее значение времени, пропускаем
            if t > time_map[row, col]:
                continue

            for drow, dcol, dist, ux, uy in neighbors:
                nrow = row + drow
                ncol = col + dcol

                if 0 <= nrow < height and 0 <= ncol < width:
                    # Стены/препятствия: grid_mask == False → считаем, что туда попасть нельзя
                    if not grid_mask[nrow, ncol]:
                        continue

                    # --------------------------
                    # Влияние ветра на скорость.
                    # --------------------------
                    # Скалярное произведение единичных векторов направления шага
                    # (ux, uy) и ветра (wind_vec_x, wind_vec_y) даёт cos(phi).
                    cos_phi = ux * wind_vec_x + uy * wind_vec_y

                    # Множитель скорости от ветра: по ветру cos_phi > 0,
                    # против ветра cos_phi < 0.
                    wind_factor = 1.0 + self.wind_influence * self.wind_speed * cos_phi
                    # Гарантируем, что итоговая скорость не станет отрицательной
                    # или слишком малой (что сломает модель).
                    wind_factor = max(wind_factor, 0.1)

                    v_eff = base_speed_env * wind_factor

                    # Время шага: расстояние / эффективная скорость.
                    dt = dist / v_eff
                    new_t = t + dt

                    # Если фронт тушения приходит сюда раньше или одновременно
                    # с фронтом огня, ячейка считается «защищённой» и не загорается.
                    if self.ext_time_map is not None:
                        ext_t = self.ext_time_map[nrow, ncol]
                        if np.isfinite(ext_t) and ext_t <= new_t:
                            # Тушение пришло раньше или одновременно — ячейка не загорается
                            continue

                    if new_t < time_map[nrow, ncol]:
                        time_map[nrow, ncol] = new_t
                        heapq.heappush(pq, (new_t, nrow, ncol))

        self.time_map = time_map

    def _compute_extinguish_time_map(
        self,
        base_speed_env: float,
        height: int,
        width: int,
        grid_mask: np.ndarray,
    ) -> np.ndarray | None:
        """
        Строит карту времени прихода фронта тушения от всех стволов.

        Используется тот же алгоритм Дейкстры по 8 направлениям, но:
          - источниками являются точки установки стволов;
          - скорость распространения тушения зависит от эффективности ствола;
          - действие ограничено по радиусу (radius).

        Возвращает массив shape = (height, width) с временем тушения в ячейке
        или inf, если фронт тушения туда не доходит.
        """
        if not self.nozzles:
            return None

        extinguish_map = np.full((height, width), np.inf, dtype=float)

        # Соседи / геометрические расстояния (без ветра)
        neighbor_steps: List[Tuple[int, int, float]] = []
        for drow, dcol in [
            (0, 1),
            (1, 0),
            (0, -1),
            (-1, 0),
            (1, 1),
            (-1, -1),
            (1, -1),
            (-1, 1),
        ]:
            grid_len = sqrt(float(drow * drow + dcol * dcol))
            dist = self.cell_size * grid_len
            neighbor_steps.append((drow, dcol, dist))

        for nozzle in self.nozzles:
            if nozzle.radius <= 0.0 or nozzle.efficiency <= 0.0:
                # Ствол без радиуса или эффективности ничего не даёт
                continue

            tmp_map = np.full((height, width), np.inf, dtype=float)

            # Стартовая ячейка ствола
            nrow, ncol = self._world_to_grid_indices(nozzle.x, nozzle.y)
            if not (0 <= nrow < height and 0 <= ncol < width):
                continue
            if not grid_mask[nrow, ncol]:
                # Ствол стоит "в стене" — игнорируем его
                continue

            tmp_map[nrow, ncol] = 0.0
            pq: List[Tuple[float, int, int]] = [(0.0, nrow, ncol)]

            # Чем выше эффективность, тем быстрее распространяется тушение
            # относительно базовой скорости огня.
            v_ext = base_speed_env * (1.0 + 2.0 * nozzle.efficiency)

            # Направление потока воды (единичный вектор)
            dir_rad = radians(nozzle.direction_deg)
            dir_vec_x = cos(dir_rad)
            dir_vec_y = sin(dir_rad)
            
            # Половина угла сектора действия
            half_angle_rad = radians(nozzle.angle_width_deg / 2.0)

            while pq:
                t, row, col = heapq.heappop(pq)
                if t > tmp_map[row, col]:
                    continue

                # Проверяем, не вышли ли мы за пределы радиуса действия ствола
                x_c, y_c = self._grid_indices_to_world_center(row, col)
                dx = x_c - nozzle.x
                dy = y_c - nozzle.y
                dist_from_nozzle = hypot(dx, dy)
                
                if dist_from_nozzle > nozzle.radius:
                    continue

                # Проверяем, попадает ли ячейка в сектор действия потока воды
                if dist_from_nozzle > 1e-6:  # избегаем деления на ноль
                    # Единичный вектор от ствола к ячейке
                    ux = dx / dist_from_nozzle
                    uy = dy / dist_from_nozzle
                    
                    # Косинус угла между направлением потока и направлением к ячейке
                    cos_angle = ux * dir_vec_x + uy * dir_vec_y
                    angle = np.arccos(np.clip(cos_angle, -1.0, 1.0))
                    
                    # Если угол больше половины ширины сектора, ячейка вне зоны действия
                    if angle > half_angle_rad:
                        continue

                for drow, dcol, dist in neighbor_steps:
                    r2 = row + drow
                    c2 = col + dcol
                    if not (0 <= r2 < height and 0 <= c2 < width):
                        continue
                    if not grid_mask[r2, c2]:
                        continue

                    # Ячейка-сосед также должна быть в радиусе действия и в секторе
                    x_n, y_n = self._grid_indices_to_world_center(r2, c2)
                    dx_n = x_n - nozzle.x
                    dy_n = y_n - nozzle.y
                    dist_n = hypot(dx_n, dy_n)
                    
                    if dist_n > nozzle.radius:
                        continue
                    
                    # Проверка сектора для соседней ячейки
                    if dist_n > 1e-6:
                        ux_n = dx_n / dist_n
                        uy_n = dy_n / dist_n
                        cos_angle_n = ux_n * dir_vec_x + uy_n * dir_vec_y
                        angle_n = np.arccos(np.clip(cos_angle_n, -1.0, 1.0))
                        if angle_n > half_angle_rad:
                            continue

                    dt = dist / v_ext
                    new_t = t + dt
                    if new_t < tmp_map[r2, c2]:
                        tmp_map[r2, c2] = new_t
                        heapq.heappush(pq, (new_t, r2, c2))

            # Объединяем фронты тушения от всех стволов по минимуму времени
            extinguish_map = np.minimum(extinguish_map, tmp_map)

        return extinguish_map

    # ------------------------------------------------------------------
    # Генерация изохроны для времени T
    # ------------------------------------------------------------------
    def get_fire_polygon(self, time: float) -> Union[Polygon, MultiPolygon]:
        """
        Сгенерировать полигон (или мультиполигон) зоны, охваченной огнем к моменту `time`.

        Шаги:
          1. Бинарная маска time_map <= time.
          2. Marching Squares (find_contours).
          3. Перевод контуров из координат решетки в мировые координаты.
          4. Объединение и пересечение с исходным полигоном здания.
        """
        if self.time_map is None or self.grid_mask is None:
            raise RuntimeError("Карта времени еще не рассчитана")

        # 1. Маска всех ячеек, куда огонь уже смог добраться
        fire_mask = (self.time_map <= time) & self.grid_mask

        # Если есть карта тушения, ячейки, куда фронт тушения пришёл
        # к моменту time, считаются потушенными.
        if self.ext_time_map is not None:
            ext_mask = self.ext_time_map <= time
            mask = fire_mask & ~ext_mask
        else:
            mask = fire_mask

        if not np.any(mask):
            # Огонь еще не успел распространиться ни в одну ячейку
            return Polygon()

        # 2. Marching Squares
        # Паддинг из одного пикселя по периметру нужен, чтобы корректно
        # извлекать контуры, которые касаются границы массива.
        padded_mask = np.pad(mask, 1, mode="constant", constant_values=False)

        # Уровень 0.5 означает линию между False (0) и True (1).
        contours = measure.find_contours(padded_mask.astype(float), 0.5)

        fire_polys: List[Polygon] = []
        for contour in contours:
            # contour: массив точек (row, col) в координатах ПОДПАДДИНГОВАННОЙ решетки.
            # Сначала убираем паддинг (смещаем на 1), затем переводим в мировые координаты.
            world_coords: List[Tuple[float, float]] = []
            for row, col in contour:
                row_unpadded = row - 1.0
                col_unpadded = col - 1.0
                x, y = self._grid_coords_to_world(row_unpadded, col_unpadded)
                world_coords.append((x, y))

            # Многоугольник имеет смысл, только если в нем >= 3 точек
            if len(world_coords) >= 3:
                poly = Polygon(world_coords)
                if poly.is_valid and not poly.is_empty:
                    fire_polys.append(poly)

        if not fire_polys:
            return Polygon()

        # 3. Объединяем все куски огня
        fire_geom = unary_union(fire_polys)

        # 4. Пересекаем с исходным полигоном здания, чтобы:
        #    - убрать "ступеньки" на границе,
        #    - гарантировать, что огонь не вылезает за стены.
        final_fire = fire_geom.intersection(self.building_polygon)

        # Дополнительно вырезаем геометрическую зону действия стволов
        # (секторы действия потока воды), чтобы даже при численных артефактах
        # визуально огонь не заходил внутрь областей тушения.
        if self.nozzles:
            protected_areas: List[Polygon] = []
            for nozzle in self.nozzles:
                if nozzle.radius <= 0.0:
                    continue
                # Создаём сектор действия потока воды (не полный круг!)
                sector = _create_sector(
                    center_x=nozzle.x,
                    center_y=nozzle.y,
                    radius=nozzle.radius,
                    direction_deg=nozzle.direction_deg,
                    angle_width_deg=nozzle.angle_width_deg,
                )
                protected_areas.append(sector)
            if protected_areas:
                protected_geom = unary_union(protected_areas)
                final_fire = final_fire.difference(protected_geom)

        # Тип результата: Polygon или MultiPolygon в зависимости от геометрии
        if isinstance(final_fire, (Polygon, MultiPolygon)):
            return final_fire
        # На всякий случай: если Shapely вернул что-то более сложное (GeometryCollection),
        # выделим только полигональные части.
        polys = [g for g in final_fire.geoms if isinstance(g, Polygon)]  # type: ignore[attr-defined]
        if not polys:
            return Polygon()
        return unary_union(polys)


# ----------------------------------------------------------------------
# Демонстрационный скрипт
# ----------------------------------------------------------------------

def _plot_polygon(ax: plt.Axes, geom: Union[Polygon, MultiPolygon], **kwargs) -> None:
    """Отрисовка Polygon / MultiPolygon на оси Matplotlib."""
    if geom.is_empty:
        return

    if isinstance(geom, MultiPolygon):
        for g in geom.geoms:
            _plot_polygon(ax, g, **kwargs)
        return

    x, y = geom.exterior.xy
    ax.fill(x, y, **kwargs)


def main() -> None:
    # 1. Более сложное здание с несколькими помещениями и коридорами
    building_poly = create_demo_building_complex()

    # 2. Точка старта внутри одного конца коридора
    start_pt = (10.0, 1.0)

    # 3. Параметры модели
    cell_size = 0.25    # размер ячейки в тех же единицах, что и координаты здания
    speed = 1.0         # базовая скорость при опорной температуре и без ветра

    # Температура: увеличиваем относительно опорной, чтобы продемонстрировать ускорение
    ambient_temperature = 40.0      # текущая температура, °C
    reference_temperature = 20.0    # опорная температура, °C
    temperature_sensitivity = 0.03  # +3% к скорости за каждый градус выше опорной

    # Ветер: направлен вдоль +X (вправо), т.е. вдоль коридора.
    # При этом распространение огня по коридору вправо будет быстрее, чем влево.
    wind_speed = 15           # условная скорость ветра
    wind_direction_deg = 0.0   # 0° = вдоль +X
    wind_influence = 0.3       # сила влияния ветра

    model = RasterFireModel(
        building_polygon=building_poly,
        start_point=start_pt,
        speed=speed,
        cell_size=cell_size,
        ambient_temperature=ambient_temperature,
        reference_temperature=reference_temperature,
        temperature_sensitivity=temperature_sensitivity,
        wind_speed=wind_speed,
        wind_direction_deg=wind_direction_deg,
        wind_influence=wind_influence,
    )

    # 4. Визуализация для нескольких моментов времени
    times = [5.0, 10.0, 15.0, 20.0]

    fig, axes = plt.subplots(2, 2, figsize=(10, 10), sharex=True, sharey=True)
    axes = axes.ravel()

    for ax, t in zip(axes, times):
        fire_geom = model.get_fire_polygon(t)

        # Здание (контур)
        _plot_polygon(ax, building_poly, edgecolor="black", facecolor="none", linewidth=1.5)

        # Огонь
        _plot_polygon(
            ax,
            fire_geom,
            edgecolor="#e67e22",
            facecolor="#d35400",
            alpha=0.7,
        )

        # Точка старта
        ax.scatter([start_pt[0]], [start_pt[1]], c="red", s=30, zorder=5)

        ax.set_title(f"t = {t:.0f}")
        ax.set_aspect("equal", adjustable="box")
        ax.grid(True, linestyle="--", alpha=0.3)

    fig.suptitle("Распространение огня в C-образном здании (растровая модель)", fontsize=14)
    plt.tight_layout()
    plt.show()


if __name__ == "__main__":
    main()