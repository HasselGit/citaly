import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool
from app.core.config import settings

db_url = settings.DATABASE_URL
if db_url and db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

print(f"[DB] Conectando a: {db_url[:40]}...")

is_vercel = os.getenv("VERCEL", "0") == "1" or os.getenv("ENVIRONMENT") == "production"

# En Vercel usamos NullPool para no agotar conexiones en funciones serverless
if is_vercel or (db_url and "supabase.com" in db_url):
    engine = create_engine(
        db_url,
        poolclass=NullPool,
        connect_args={"connect_timeout": 15}
    )
else:
    engine = create_engine(
        db_url,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        connect_args={"connect_timeout": 10}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def init_db():
    """Crea todas las tablas si no existen. Se llama en startup."""
    from app.models.tenant import Tenant
    from app.models.service import Service
    from app.models.patient import Patient
    from app.models.appointment import Appointment
    from app.models.whatsapp_log import WhatsAppLog

    try:
        Base.metadata.create_all(bind=engine)
        print("[DB] Tablas verificadas/creadas con éxito.")
    except Exception as e:
        print(f"[DB] Error al crear tablas: {e}")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
