# alembic/env.py
import os
from logging.config import fileConfig

from sqlalchemy import create_engine, pool
from sqlalchemy.engine import Connection

from alembic import context

# 1) импортируем конфиг приложения и МОДЕЛИ до чтения metadata
from backend.core.config import get_settings
from backend.models import *  # noqa: F401,F403  <- важно, чтобы все таблицы были зарегистрированы
from backend.models.base import Base

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

settings = get_settings()


def get_url() -> str:
    # Alembic запускаем на sync-драйвере
    url = os.getenv("DATABASE_URL", settings.database_url)
    return url.replace("postgresql+asyncpg", "postgresql+psycopg2")


def run_migrations_offline() -> None:
    context.configure(
        url=get_url(),
        target_metadata=Base.metadata,  # <-- ОБЯЗАТЕЛЬНО
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection, target_metadata=Base.metadata
    )  # <-- ОБЯЗАТЕЛЬНО
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    configuration = config.get_section(config.config_ini_section) or {}
    configuration["sqlalchemy.url"] = get_url()
    connectable = create_engine(
        configuration["sqlalchemy.url"], poolclass=pool.NullPool
    )

    with connectable.connect() as connection:
        do_run_migrations(connection)
    connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
