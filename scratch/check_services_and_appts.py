import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))
with engine.connect() as conn:
    services = conn.execute(text("SELECT id, name, tenant_id FROM services;")).fetchall()
    print("=== SERVICIOS EN BD ===")
    for s in services:
        print(dict(s._mapping))
    
    appts = conn.execute(text("SELECT a.id, a.service_id, a.start_time, a.status, p.full_name, p.whatsapp_phone FROM appointments a JOIN patients p ON a.patient_id = p.id WHERE a.status != 'CANCELLED';")).fetchall()
    print("\n=== TURNOS ACTIVOS EN BD ===")
    for a in appts:
        print(dict(a._mapping))
