import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

db_url = settings.DATABASE_URL
if db_url and db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# Fallback local SQLite para desarrollo si el host remoto PostgreSQL de Supabase no es alcanzable sin internet
try:
    engine = create_engine(
        db_url,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        connect_args={"connect_timeout": 3}
    )
    # Probar conexión básica
    with engine.connect() as conn:
        pass
except Exception as e:
    print(f"PostgreSQL connection offline or unavailable, falling back to local SQLite dev db: {e}")
    sqlite_url = "sqlite:///./citaly_dev.db"
    engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
