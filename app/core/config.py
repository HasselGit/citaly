import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    APP_NAME: str = os.getenv("APP_NAME", "Citaly")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/citaly_db"
    )
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_PROJECT_ID: str = os.getenv("SUPABASE_PROJECT_ID", "")
    
    # WhatsApp Meta Cloud API
    WHATSAPP_TOKEN: str = os.getenv("WHATSAPP_TOKEN", os.getenv("WHATSAPP_ACCESS_TOKEN", ""))
    WHATSAPP_PHONE_NUMBER_ID: str = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "1234817073057013")
    WABA_ID: str = os.getenv("WABA_ID", "1006525879102174")
    WHATSAPP_VERIFY_TOKEN: str = os.getenv("WHATSAPP_VERIFY_TOKEN", "citaly_verify_token_2026")

    class Config:
        case_sensitive = True

settings = Settings()
