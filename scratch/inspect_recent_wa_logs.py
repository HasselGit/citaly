import os
from dotenv import load_dotenv
load_dotenv()
from sqlalchemy import create_engine, text

db_url = os.getenv("DATABASE_URL")
engine = create_engine(db_url)

with engine.connect() as conn:
    # Ver las últimas 10 citas y sus logs de WhatsApp
    q = text("""
        SELECT a.id, a.start_time, a.status, p.full_name, p.whatsapp_phone, s.name as service_name,
               w.message_type, w.status as wa_status, w.sent_at
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        JOIN services s ON a.service_id = s.id
        LEFT JOIN whatsapp_logs w ON w.appointment_id = a.id
        ORDER BY a.created_at DESC
        LIMIT 10;
    """)
    rows = conn.execute(q).fetchall()
    print("=== ÚLTIMAS 10 CITAS Y LOGS DE WHATSAPP ===")
    for r in rows:
        print(f"Cita: {r.id[:8]} | Paciente: {r.full_name} ({r.whatsapp_phone}) | Servicio: {r.service_name} | Inicio: {r.start_time} | Estado: {r.status} | WA Tipo: {r.message_type} | WA Status: {r.wa_status}")
