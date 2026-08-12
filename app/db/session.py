import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool
from app.core.config import settings

db_url = settings.DATABASE_URL
if db_url and db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# En Vercel Serverless o producción, usamos NullPool para no agotar conexiones en cada invocación lambda
is_vercel = os.getenv("VERCEL", "0") == "1" or os.getenv("ENVIRONMENT") == "production"

try:
    if is_vercel or "supabase.com" in db_url:
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
            connect_args={"connect_timeout": 5}
        )
    # Probar conexión
    with engine.connect() as conn:
        print("[DB] Conexión permanente a Supabase PostgreSQL verificada con éxito.")
except Exception as e:
    print(f"PostgreSQL connection issue, using fallback SQLite: {e}")
    db_path = "/tmp/citaly_dev.db" if is_vercel else "./citaly_dev.db"
    sqlite_url = f"sqlite:///{db_path}"
    engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def init_db():
    try:
        from app.models import models
        Base.metadata.create_all(bind=engine)
        print("[DB] Tablas verificadas/creadas con éxito.")
    except Exception as e:
        print(f"[DB] Error al inicializar tablas: {e}")

# Asegurar tablas en arranque
init_db()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
