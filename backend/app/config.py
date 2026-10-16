import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "UResearch API"
    environment: str = "development"
    database_url: str = "postgresql+psycopg://uresearch:uresearch@localhost:5432/uresearch"
    redis_url: str = "redis://localhost:6379/0"
    cors_origins: str = "http://localhost:3000"
    gemini_api_key: str | None = None

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def resolved_gemini_key(self) -> str | None:
        """Resolve Gemini API key supporting Gemini_API_KEY, GEMINI_API_KEY, and gemini_api_key."""
        return (
            self.gemini_api_key
            or os.getenv("Gemini_API_KEY")
            or os.getenv("GEMINI_API_KEY")
            or os.getenv("gemini_api_key")
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()

