import os
import sys
from dotenv import load_dotenv

load_dotenv()

from app.db.session import SessionLocal
from app.models.appointment import Appointment
from app.models.patient import Patient
from app.models.whatsapp_log import WhatsAppLog

db = SessionLocal()

print("--- RECENT APPOINTMENTS ---")
appts = db.query(Appointment).order_by(Appointment.created_at.desc()).limit(5).all()
for a in appts:
    patient = db.query(Patient).filter(Patient.id == a.patient_id).first()
    print(f"ID: {a.id} | Start: {a.start_time} | Status: {a.status} | Patient: {patient.full_name if patient else 'None'} ({patient.whatsapp_phone if patient else ''}) | Created: {a.created_at}")

print("\n--- RECENT WHATSAPP LOGS ---")
logs = db.query(WhatsAppLog).order_by(WhatsAppLog.sent_at.desc()).limit(5).all()
for l in logs:
    print(f"ID: {l.id} | ApptID: {l.appointment_id} | Type: {l.message_type} | Status: {l.status} | MetaID: {l.meta_message_id} | Time: {l.sent_at}")

db.close()
