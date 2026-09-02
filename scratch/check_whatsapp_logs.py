import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))
with engine.connect() as conn:
    logs = conn.execute(text("SELECT * FROM whatsapp_logs ORDER BY sent_at DESC LIMIT 20;")).fetchall()
    print("=== ÚLTIMOS LOGS DE WHATSAPP EN BD ===")
    for l in logs:
        print(dict(l._mapping))
