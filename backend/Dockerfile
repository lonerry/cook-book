FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=on \
    PIP_NO_CACHE_DIR=off

WORKDIR /app

# System deps (psycopg2-binary already in requirements; no gcc needed)
RUN apt-get update -y && apt-get install -y --no-install-recommends \
    curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY backend /app/backend
COPY alembic.ini /app/alembic.ini
COPY backend/alembic /app/backend/alembic

ENV PYTHONPATH=/app

EXPOSE 8000

CMD ["sh", "-c", "alembic -c /app/alembic.ini upgrade head && uvicorn backend.main:app --host 0.0.0.0 --port 8000"]


