import os
import sys
import uuid
from datetime import datetime, timedelta

# Ensure python path includes project root
sys.path.insert(0, os.getcwd())

from app.db.session import SessionLocal, engine, Base
from app.models.models import Tenant, Service, Patient, Appointment, WhatsAppLog
from app.api.v1.endpoints.booking import get_or_create_primary_tenant, clean_phone_digits

def test_booking_creation():
    db = SessionLocal()
    try:
        tenant = get_or_create_primary_tenant(db)
        print(f"Primary Tenant: {tenant.id} - {tenant.business_name}")

        service = db.query(Service).filter(Service.tenant_id == tenant.id).first()
        if not service:
            service = Service(
                id=str(uuid.uuid4()),
                tenant_id=tenant.id,
                name="Ortodoncia / Control",
                duration_minutes=120,
                price=15000,
                is_active=True
            )
            db.add(service)
            db.commit()
            db.refresh(service)
        print(f"Service: {service.id} - {service.name}")

        # Try creating appointment
        start_time_iso = "2026-08-15T10:00:00"
        start_dt = datetime.fromisoformat(start_time_iso)
        end_dt = start_dt + timedelta(minutes=service.duration_minutes)

        patient = Patient(
            id=str(uuid.uuid4()),
            tenant_id=tenant.id,
            full_name="Test Patient",
            whatsapp_phone="+5492302123456"
        )
        db.add(patient)
        db.commit()
        db.refresh(patient)
        print(f"Patient: {patient.id} - {patient.full_name}")

        token_cancel = str(uuid.uuid4())
        appointment = Appointment(
            id=str(uuid.uuid4()),
            tenant_id=tenant.id,
            service_id=service.id,
            patient_id=patient.id,
            start_time=start_dt,
            end_time=end_dt,
            status="SCHEDULED",
            token_cancellation=token_cancel
        )
        db.add(appointment)
        db.commit()
        db.refresh(appointment)
        print(f"SUCCESS! Appointment created: {appointment.id}")

    except Exception as e:
        print(f"ERROR: {type(e).__name__} - {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_booking_creation()
