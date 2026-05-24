from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    ANTHROPIC_API_KEY: str = ""
    XAI_API_KEY: str = ""
    AI_PROVIDER: str = "anthropic"  # Options: anthropic, xai

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()