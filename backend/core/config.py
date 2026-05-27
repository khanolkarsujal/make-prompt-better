from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    OLLAMA_BASE_URL: str = "http://localhost:11434/v1"
    OLLAMA_MODEL: str = "qwen2.5:7b"
    AI_PROVIDER: str = "ollama"
    INFERENCE_STRATEGY: str = "local" # 'local' or 'cloud'

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()