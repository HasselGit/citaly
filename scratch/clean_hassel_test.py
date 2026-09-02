import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))
with engine.connect() as conn:
    conn.execute(text("DELETE FROM whatsapp_logs WHERE appointment_id = '0636cbab-44a7-46e1-ad37-2369421bf9ea';"))
    conn.execute(text("DELETE FROM appointments WHERE id = '0636cbab-44a7-46e1-ad37-2369421bf9ea';"))
    conn.commit()
    print("Turno de test de Hassel limpiado.")
