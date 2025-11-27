from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@db:5432/interview_db"

    # Scibox LLM API
    scibox_api_key: str = "sk-uh55w42lHCu9slecY8lT2w"
    scibox_base_url: str = "https://llm.t1v.scibox.tech/v1"

    # JWT
    secret_key: str = "dev-secret-key-change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24 hours

    # Redis (for session storage)
    redis_url: str = "redis://redis:6379/0"

    # Docker (for code execution)
    docker_timeout: int = 10  # seconds
    docker_memory_limit: str = "128m"
    docker_cpu_limit: str = "0.8"  # CPU shares (0.8 = 80% of one CPU core)

    # LLM Models
    model_chat: str = "qwen3-32b-awq"
    model_coder: str = "qwen3-coder-30b-a3b-instruct-fp8"
    model_embedding: str = "bge-m3"

    # Admin bootstrap
    superadmin_username: str = "superadmin"
    superadmin_password: str = "superadmin123"  # Измените в .env для продакшена
    superadmin_email: str = "superadmin@example.com"

    # Localization defaults
    default_task_language: str = "ru"

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
        protected_namespaces=("settings_",),
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
