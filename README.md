# 🍳 CookBook – full‑stack приложение рецептов

CookBook — это полнофункциональное приложение для публикации и поиска рецептов. Бэкенд на FastAPI + SQLAlchemy, фронтенд на React/Vite, база PostgreSQL, Redis для чёрного списка JWT, S3‑совместимое хранилище для изображений. Есть email‑верификация и сброс пароля. Проект полностью упакован в Docker Compose.

## ✨ Возможности
- Создание/редактирование рецептов, фото обложки и фото шагов
- Комментарии, лайки, публичный профиль пользователя
- Поиск рецептов с FTS (PostgreSQL, русская морфология + pg_trgm)
- Регистрация с email‑верификацией, вход по JWT Bearer
- Сброс пароля по email, черный список токенов (logout)
- Хранение изображений в S3‑совместимом хранилище

## 🧰 Технологии
- Backend: FastAPI, SQLAlchemy 2.x (async), Alembic, Pydantic v2
- DB: PostgreSQL 16, FTS + pg_trgm
- Cache/blacklist: Redis 7
- Frontend: React, Vite, TypeScript, Tailwind CSS, Redux Toolkit
- Storage: S3‑совместимое (MinIO/Wasabi/S3)
- Контейнеризация: Docker, Docker Compose


## 🚀 Быстрый старт (Docker)
1) Скопируйте переменные окружения и заполните значения:
```bash
cp env.example .env
```
2) Запустите стек:
```bash
docker compose up -d --build
```
3) Откройте приложения:
- Frontend: http://localhost:5173
- Backend OpenAPI: http://localhost:8000/docs

Миграции Alembic выполняются автоматически при старте бэкенда.

## 🛠️ Локальная разработка без Docker
Требования: Python 3.11, Node 20+, PostgreSQL, Redis.

Backend
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp env.example .env  # и заполните значения

# миграции 📦
alembic -c alembic.ini upgrade head

# запуск API ▶️
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

# воркер очереди писем (если используется MQ) ✉️
python -m backend.workers.mq_worker
```

Frontend
```bash
cd frontend
npm ci
npm run dev
# http://localhost:5173
```
