import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

db_url = os.getenv("DATABASE_URL")
engine = create_engine(db_url)

with engine.connect() as conn:
    print("Creando tabla time_blocks si no existe...")
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS time_blocks (
            id VARCHAR(36) PRIMARY KEY,
            tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id),
            start_time TIMESTAMP NOT NULL,
            end_time TIMESTAMP NOT NULL,
            reason VARCHAR(100),
            is_all_day BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS ix_time_blocks_tenant_id ON time_blocks(tenant_id);
        CREATE INDEX IF NOT EXISTS ix_time_blocks_start_time ON time_blocks(start_time);
        CREATE INDEX IF NOT EXISTS ix_time_blocks_end_time ON time_blocks(end_time);
    """))
    conn.commit()
    print("✅ Tabla time_blocks creada y verificada exitosamente.")
