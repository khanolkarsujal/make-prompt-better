from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    ANTHROPIC_API_KEY: Optional[str] = None
    GOOGLE_API_KEY: Optional[str] = None
    XAI_API_KEY: Optional[str] = None
    OLLAMA_BASE_URL: str = "http://localhost:11434/v1"
    OLLAMA_MODEL: str = "deepseek-coder:6.7b"
    AI_PROVIDER: str = "google"  # Options: anthropic, xai, ollama, google

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()