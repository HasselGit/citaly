import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))
with engine.connect() as conn:
    conn.execute(text("DELETE FROM whatsapp_logs WHERE appointment_id = '2fd89ae3-f42e-486a-9537-e4d9241667b1';"))
    conn.execute(text("DELETE FROM appointments WHERE id = '2fd89ae3-f42e-486a-9537-e4d9241667b1';"))
    conn.commit()
    print("Turno de test limpiado de la BD.")
