from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl, validator
from typing import List, Optional, Union
import secrets


class Settings(BaseSettings):
    APP_NAME: str = "LearnLoom Scraping Engine"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    SECRET_KEY: str = secrets.token_urlsafe(32)
    API_V1_STR: str = "/api/v1"

    # Database
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "learnloom"
    POSTGRES_PASSWORD: str = "learnloom_secret"
    POSTGRES_DB: str = "learnloom_db"

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def SYNC_DATABASE_URL(self) -> str:
        return (
            f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: Optional[str] = None
    REDIS_DB: int = 0

    @property
    def REDIS_URL(self) -> str:
        if self.REDIS_PASSWORD:
            return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"

    # Celery
    CELERY_BROKER_URL: str = ""
    CELERY_RESULT_BACKEND: str = ""

    @validator("CELERY_BROKER_URL", pre=True, always=True)
    def set_celery_broker(cls, v, values):
        if v:
            return v
        redis_host = values.get("REDIS_HOST", "localhost")
        redis_port = values.get("REDIS_PORT", 6379)
        return f"redis://{redis_host}:{redis_port}/1"

    @validator("CELERY_RESULT_BACKEND", pre=True, always=True)
    def set_celery_backend(cls, v, values):
        if v:
            return v
        redis_host = values.get("REDIS_HOST", "localhost")
        redis_port = values.get("REDIS_PORT", 6379)
        return f"redis://{redis_host}:{redis_port}/2"

    # Scraping
    SCRAPE_CONCURRENT_REQUESTS: int = 16
    SCRAPE_DOWNLOAD_DELAY: float = 1.0
    SCRAPE_RETRY_TIMES: int = 3
    SCRAPE_TIMEOUT: int = 30
    SCRAPE_SCHEDULE_HOURS: int = 24

    # Proxy (optional)
    PROXY_LIST: List[str] = []
    PROXY_ENABLED: bool = False

    # AI Classification
    OPENAI_API_KEY: Optional[str] = None
    SIMILARITY_THRESHOLD: float = 0.85

    # Pagination
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    # Cache TTL (seconds)
    CACHE_TTL_RESOURCES: int = 300
    CACHE_TTL_CATEGORIES: int = 3600
    CACHE_TTL_TRENDING: int = 600

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8000"]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
