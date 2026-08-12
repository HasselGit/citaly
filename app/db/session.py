import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool
from app.core.config import settings

db_url = settings.DATABASE_URL
if db_url and db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

print(f"[DB] URL configurada: {db_url[:50]}...")

is_vercel = os.getenv("VERCEL", "0") == "1" or os.getenv("ENVIRONMENT") == "production"

# NullPool es obligatorio en Vercel serverless — no mantener conexiones entre invocaciones
if is_vercel or (db_url and "supabase.com" in db_url):
    engine = create_engine(
        db_url,
        poolclass=NullPool,
        connect_args={"connect_timeout": 10}
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


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
