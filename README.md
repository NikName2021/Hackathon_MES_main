# Template MJS

Многокомпонентный проект для совместной работы в режиме реального времени: система комнат с ролями, моделирование распространения огня и тушения, WebSocket-коммуникация.

## Структура проекта

```
template_mjs/
├── src/                    # Backend API (FastAPI)
│   └── app/
│       ├── api/routes/     # API-маршруты
│       ├── core/           # Конфигурация, события, WebSocket
│       ├── database/       # Модели SQLAlchemy
│       ├── helpers/        # Аутентификация
│       ├── middleware/     # Middleware
│       ├── repositories/   # Репозитории
│       ├── schemas/        # Pydantic-схемы
│       └── services/       # Бизнес-логика
├── model/                  # Сервис модели огня (FastAPI)
├── spa/                    # Frontend (React + Vite)
├── web/                    # LiveKit PTT веб-приложение
├── token-server/           # LiveKit token server
└── docker/                 # Конфигурация Docker
```

## Технологический стек

| Компонент | Технологии |
|-----------|------------|
| **Backend** | Python 3.10, FastAPI, SQLAlchemy 2.0, asyncpg, Pydantic, JWT |
| **Model** | FastAPI, NumPy, Shapely, scikit-image, matplotlib |
| **Frontend** | React 19, Vite 7, TypeScript, Tailwind CSS, Zustand, Socket.IO, LiveKit |
| **БД** | PostgreSQL 17 |

## Требования

- Python 3.10+
- Node.js 18+
- Docker и Docker Compose
- PostgreSQL 17 (через Docker)

## Быстрый старт

### 1. Переменные окружения

Скопируйте примеры и настройте переменные:

```bash
# Корневой .env (для Docker)
cp .env.example .env

# Backend
cp src/app/.env.example src/app/.env
```

Основные переменные для backend (`src/app/.env`):

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `DEBUG` | Режим отладки | `False` |
| `HOST` | Хост сервера | `localhost` |
| `PORT` | Порт API | `8000` |
| `SECRET_KEY` | Ключ для JWT | — |
| `POSTGRES_HOST` | Хост PostgreSQL | `localhost` |
| `POSTGRES_PORT` | Порт PostgreSQL | `5432` |
| `POSTGRES_USER` | Пользователь БД | — |
| `POSTGRES_PASSWORD` | Пароль БД | — |
| `POSTGRES_DATABASE` | Имя БД | — |
| `USERNAME` | Логин админа | — |
| `PASSWORD` | Пароль админа | — |

### 2. Запуск через Docker Compose

```bash
# Запуск PostgreSQL и model worker
docker compose up -d

# PostgreSQL будет доступен на порту 5446
```

### 3. Backend (локально)

```bash
cd src/app
pip install -r ../requirements.txt
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API будет доступно по адресу: `http://localhost:8000`

### 4. Model Worker (локально)

```bash
cd model
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 7000
```

### 5. Frontend (SPA)

```bash
cd spa
npm install
npm run dev
```

Создайте `spa/.env` при необходимости:

```
VITE_API_URL=http://localhost:8000
```

Приложение откроется на `http://localhost:5173`. Vite проксирует `/api` на backend.

## API

### Backend (`/api/v1`)

- **User** — пользователи, аутентификация
- **Room** — комнаты, создание, статус, WebSocket
- **Invite** — приглашения по ссылкам
- **Map Input** — загрузка карт/изображений
- **Dispatcher Action** — действия диспетчера

### Model (`/calculate_fire`)

- `GET /health` — проверка работоспособности
- `GET /config` — текущая конфигурация среды
- `POST /config` — обновление конфигурации (ветер, температура и т.д.)
- `POST /nozzles` — добавление противопожарного ствола
- `DELETE /nozzles/{index}` — удаление ствола
- `PUT /nozzles/{index}` — обновление ствола
- `GET /fire?time=T` — геометрия огня на момент времени T (GeoJSON)

## Роли в комнате

- **Диспетчер** (dispatcher)
- **РТП** (rtp)
- **Штаб** (headquarters)
- **БУ1** (by1)
- **БУ2** (by2)

## Документация API

После запуска backend:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Лицензия

Проект для внутреннего использования.
