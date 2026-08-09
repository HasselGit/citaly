from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date, timedelta
import uuid

from app.db.session import get_db
from app.models.tenant import Tenant
from app.models.service import Service
from app.models.patient import Patient
from app.models.appointment import Appointment
from app.models.whatsapp_log import WhatsAppLog
from app.services.booking import calculate_available_slots

router = APIRouter(prefix="/api/v1/booking", tags=["Booking"])

# --- Schemas ---
class ServiceOut(BaseModel):
    id: str
    name: str
    duration_minutes: int
    price: Optional[float]

    class Config:
        from_attributes = True

class TenantOut(BaseModel):
    id: str
    business_name: str
    owner_name: str
    subdomain: str
    category: str
    whatsapp_number: str

    class Config:
        from_attributes = True

class AppointmentCreateRequest(BaseModel):
    service_id: str
    start_time: str # ISO string: YYYY-MM-DDTHH:MM:SS
    patient_full_name: str
    patient_whatsapp: str

# --- Endpoints ---

@router.get("/tenant-info", response_model=TenantOut)
def get_tenant_info(request: Request, db: Session = Depends(get_db)):
    subdomain = getattr(request.state, "subdomain", "demo")
    tenant = db.query(Tenant).filter(Tenant.subdomain == subdomain).first()
    
    # Si no existe en demo, creamos un tenant ficticio por defecto para desarrollo
    if not tenant:
        tenant = Tenant(
            subdomain=subdomain,
            business_name="Consultorio Odontológico Dr. Pérez",
            owner_name="Dr. Alejandro Pérez",
            category="Odontología",
            whatsapp_number="+5491100001111"
        )
        db.add(tenant)
        db.commit()
        db.refresh(tenant)

        # Agregar servicios semilla
        s1 = Service(tenant_id=tenant.id, name="Ortodoncia / Control", duration_minutes=120, price=15000)
        s2 = Service(tenant_id=tenant.id, name="Limpieza & Blanqueamiento", duration_minutes=45, price=8000)
        db.add_all([s1, s2])
        db.commit()

    return tenant

@router.get("/services", response_model=List[ServiceOut])
def get_services(request: Request, db: Session = Depends(get_db)):
    subdomain = getattr(request.state, "subdomain", "demo")
    tenant = db.query(Tenant).filter(Tenant.subdomain == subdomain).first()
    if not tenant:
        # Inicializar tenant si es la primera vez
        get_tenant_info(request, db)
        tenant = db.query(Tenant).filter(Tenant.subdomain == subdomain).first()

    return db.query(Service).filter(
        Service.tenant_id == tenant.id,
        Service.is_active == True
    ).all()

@router.get("/availability")
def get_availability(
    service_id: str,
    target_date_str: str, # YYYY-MM-DD
    request: Request,
    db: Session = Depends(get_db)
):
    subdomain = getattr(request.state, "subdomain", "demo")
    tenant = db.query(Tenant).filter(Tenant.subdomain == subdomain).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Consultorio no encontrado")

    try:
        target_date = date.fromisoformat(target_date_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido. Use YYYY-MM-DD")

    slots = calculate_available_slots(db, tenant.id, service_id, target_date)
    return {
        "subdomain": subdomain,
        "service_id": service_id,
        "date": target_date_str,
        "slots": slots
    }

@router.post("/appointments")
def create_appointment(
    payload: AppointmentCreateRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    subdomain = getattr(request.state, "subdomain", "demo")
    tenant = db.query(Tenant).filter(Tenant.subdomain == subdomain).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Consultorio no encontrado")

    service = db.query(Service).filter(Service.id == payload.service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Tratamiento no encontrado")

    try:
        start_dt = datetime.fromisoformat(payload.start_time)
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de hora de inicio inválido")

    end_dt = start_dt + timedelta(minutes=service.duration_minutes)

    # 1. Buscar o crear el paciente
    patient = db.query(Patient).filter(
        Patient.tenant_id == tenant.id,
        Patient.whatsapp_phone == payload.patient_whatsapp
    ).first()

    if not patient:
        patient = Patient(
            tenant_id=tenant.id,
            full_name=payload.patient_full_name,
            whatsapp_phone=payload.patient_whatsapp
        )
        db.add(patient)
        db.commit()
        db.refresh(patient)

    # 2. Crear la cita
    token_cancel = str(uuid.uuid4())
    appointment = Appointment(
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

    # 3. Registrar log de WhatsApp inicial
    wa_log = WhatsAppLog(
        appointment_id=appointment.id,
        message_type="CONFIRMATION",
        status="SENT"
    )
    db.add(wa_log)
    db.commit()

    return {
        "success": True,
        "appointment_id": appointment.id,
        "business_name": tenant.business_name,
        "service_name": service.name,
        "patient_name": patient.full_name,
        "start_time": appointment.start_time.isoformat(),
        "cancellation_token": token_cancel,
        "whatsapp_preview": f"✅ Tu cita con {tenant.business_name} para {service.name} está confirmada para el {appointment.start_time.strftime('%d/%m a las %H:%M hs')}. Reprogramar o cancelar aquí: https://citaly.com/r/{token_cancel}"
    }

@router.post("/cancel/{token}")
def cancel_appointment(token: str, db: Session = Depends(get_db)):
    appointment = db.query(Appointment).filter(Appointment.token_cancellation == token).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Turno no encontrado o ya fue cancelado")

    appointment.status = "CANCELLED"
    db.commit()

    return {
        "success": True,
        "message": "Turno cancelado exitosamente. El horario ha sido liberado para otros pacientes."
    }
