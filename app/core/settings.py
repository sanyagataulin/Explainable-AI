from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    openai_api_key: str = Field(default="")
    openai_model: str = Field(default="gpt-4o")
    openai_embedding_model: str = Field(default="text-embedding-3-small")

    database_url: str = Field(default="postgresql+asyncpg://postgres:postgres@localhost:5432/investments")
    redis_url: str = Field(default="redis://localhost:6379/0")
    vector_store_path: Path = Field(default=Path("data/vector_store"))

    market_data_ttl_sec: int = Field(default=3600)
    max_conversation_history: int = Field(default=10)
    retrieval_k: int = Field(default=5)
    log_level: str = Field(default="INFO")

    app_host: str = Field(default="0.0.0.0")
    app_port: int = Field(default=8000)


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.vector_store_path.mkdir(parents=True, exist_ok=True)
    return settings
