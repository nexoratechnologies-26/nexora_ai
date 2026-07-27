import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # App General Settings
    APP_NAME: str = "Nexora AI API"
    API_V1_STR: str = "/api/v1"
    
    # Security & Auth
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-nexora-key-for-jwt-signing-change-me")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week

    # DB Config
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./nexora_local.db")
    
    # Vector DB Config
    CHROMA_DB_DIR: str = os.getenv("CHROMA_DB_DIR", "./chroma_db")
    
    # Media & File storage paths (local data directory)
    DATA_DIR: str = os.getenv("DATA_DIR", "./nexora_data")
    UPLOAD_DIR: str = os.path.join(DATA_DIR, "uploads")
    SCREENSHOT_DIR: str = os.path.join(DATA_DIR, "screenshots")
    NOTES_DIR: str = os.path.join(DATA_DIR, "notes")
    
    # API Keys for AI Providers (Optional at startup, can be supplied in Settings UI and stored encrypted/local DB)
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY", "")
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", "")
    ANTHROPIC_API_KEY: Optional[str] = os.getenv("ANTHROPIC_API_KEY", "")
    
    # Local Ollama Provider Host
    OLLAMA_HOST: str = os.getenv("OLLAMA_HOST", "http://localhost:11434")

    class Config:
        case_sensitive = True

settings = Settings()

# Ensure directories exist
os.makedirs(settings.DATA_DIR, exist_ok=True)
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.SCREENSHOT_DIR, exist_ok=True)
os.makedirs(settings.NOTES_DIR, exist_ok=True)
os.makedirs(settings.CHROMA_DB_DIR, exist_ok=True)
