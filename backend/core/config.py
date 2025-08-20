from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str
    env: str
    debug: bool
    host: str
    port: int

    secret_key: str
    algorithm: str
    access_token_expire_minutes: int

    database_url: str

    smtp_host: str
    smtp_port: int
    smtp_user: str
    smtp_password: str
    smtp_from: str

    mq_endpoint: str
    mq_region: str
    mq_access_key_id: str
    mq_secret_access_key: str
    mq_queue_url: str

    s3_endpoint: str
    s3_region: str
    s3_access_key_id: str
    s3_secret_access_key: str
    s3_bucket: str

    redis_url: str
    token_blacklist_ttl_seconds: int

    frontend_url: str
    reset_token_ttl_seconds: int

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
