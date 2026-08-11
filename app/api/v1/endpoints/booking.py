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

class RescheduleRequest(BaseModel):
    appointment_id: str
    new_start_time: str

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

        # Agregar servicios semilla (6 servicios para probar la PWA con oferta amplia)
        s1 = Service(tenant_id=tenant.id, name="Ortodoncia / Control", duration_minutes=120, price=15000)
        s2 = Service(tenant_id=tenant.id, name="Limpieza & Blanqueamiento", duration_minutes=45, price=8000)
        s3 = Service(tenant_id=tenant.id, name="Implante Dental & Cirugía", duration_minutes=90, price=45000)
        s4 = Service(tenant_id=tenant.id, name="Endodoncia / Conducto", duration_minutes=60, price=22000)
        s5 = Service(tenant_id=tenant.id, name="Extracción Muela de Juicio", duration_minutes=60, price=18000)
        s6 = Service(tenant_id=tenant.id, name="Consulta & Diagnóstico", duration_minutes=30, price=5000)
        db.add_all([s1, s2, s3, s4, s5, s6])
        db.commit()

    return tenant

@router.get("/services", response_model=List[ServiceOut])
def get_services(request: Request, db: Session = Depends(get_db)):
    subdomain = getattr(request.state, "subdomain", "demo")
    tenant = db.query(Tenant).filter(Tenant.subdomain == subdomain).first()
    if not tenant:
        get_tenant_info(request, db)
        tenant = db.query(Tenant).filter(Tenant.subdomain == subdomain).first()

    existing_services = db.query(Service).filter(
        Service.tenant_id == tenant.id,
        Service.is_active == True
    ).all()

    # Si hay menos de 6 servicios en base de datos, insertar los nuevos 4 servicios para que la prueba tenga los 6 completos
    if len(existing_services) < 6:
        names = [s.name for s in existing_services]
        new_services = []
        if "Implante Dental & Cirugía" not in names:
            new_services.append(Service(tenant_id=tenant.id, name="Implante Dental & Cirugía", duration_minutes=90, price=45000))
        if "Endodoncia / Conducto" not in names:
            new_services.append(Service(tenant_id=tenant.id, name="Endodoncia / Conducto", duration_minutes=60, price=22000))
        if "Extracción Muela de Juicio" not in names:
            new_services.append(Service(tenant_id=tenant.id, name="Extracción Muela de Juicio", duration_minutes=60, price=18000))
        if "Consulta & Diagnóstico" not in names:
            new_services.append(Service(tenant_id=tenant.id, name="Consulta & Diagnóstico", duration_minutes=30, price=5000))

        if new_services:
            db.add_all(new_services)
            db.commit()

        existing_services = db.query(Service).filter(
            Service.tenant_id == tenant.id,
            Service.is_active == True
        ).all()

    return existing_services

from fastapi import Response

@router.get("/availability")
def get_availability(
    service_id: str,
    target_date_str: str, # YYYY-MM-DD
    request: Request,
    response: Response,
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

    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"

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
        "whatsapp_preview": f"✅ Tu cita con {tenant.business_name} para {service.name} está confirmada para el {appointment.start_time.strftime('%d/%m a las %H:%M hs')}. Reprogramar o cancelar aquí: https://citaly-six.vercel.app/r/{token_cancel}"
    }

@router.get("/appointments")
def get_appointments(request: Request, db: Session = Depends(get_db)):
    """
    Retorna la lista de turnos agendados para el Dashboard de la secretaria.
    """
    subdomain = getattr(request.state, "subdomain", "demo")
    tenant = db.query(Tenant).filter(Tenant.subdomain == subdomain).first()
    if not tenant:
        return []

    appts = db.query(Appointment).filter(Appointment.tenant_id == tenant.id).order_by(Appointment.start_time.asc()).all()
    
    result = []
    for a in appts:
        patient = db.query(Patient).filter(Patient.id == a.patient_id).first()
        service = db.query(Service).filter(Service.id == a.service_id).first()
        result.append({
            "id": a.id,
            "patient_name": patient.full_name if patient else "Paciente",
            "patient_whatsapp": patient.whatsapp_phone if patient else "",
            "service_name": service.name if service else "Servicio",
            "duration_minutes": service.duration_minutes if service else 30,
            "start_time": a.start_time.isoformat(),
            "time_str": a.start_time.strftime("%H:%M"),
            "status": a.status,
            "token_cancellation": a.token_cancellation
        })
    return result

import re

def clean_phone(phone: str) -> str:
    digits = re.sub(r'\D', '', phone or '')
    return digits[-10:] if len(digits) >= 10 else digits

@router.get("/check-patient")
def check_patient_existing_appointment(
    phone: str,
    service_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Verifica si el paciente ya tiene una cita activa agendada para este tratamiento.
    """
    subdomain = getattr(request.state, "subdomain", "demo")
    tenant = db.query(Tenant).filter(Tenant.subdomain == subdomain).first()
    if not tenant:
        return {"has_active_appointment": False}

    target_digits = clean_phone(phone)
    if not target_digits:
        return {"has_active_appointment": False}

    # Buscar todos los pacientes del tenant y comparar digitos limpios
    patients = db.query(Patient).filter(Patient.tenant_id == tenant.id).all()
    matched_patient = None
    for p in patients:
        if clean_phone(p.whatsapp_phone) == target_digits:
            matched_patient = p
            break

    if not matched_patient:
        return {"has_active_appointment": False}

    appt = db.query(Appointment).filter(
        Appointment.tenant_id == tenant.id,
        Appointment.patient_id == matched_patient.id,
        Appointment.service_id == service_id,
        Appointment.status.in_(["SCHEDULED", "CONFIRMED"])
    ).first()

    if appt:
        service = db.query(Service).filter(Service.id == appt.service_id).first()
        return {
            "has_active_appointment": True,
            "appointment": {
                "id": appt.id,
                "patient_name": matched_patient.full_name,
                "service_name": service.name if service else "",
                "start_time_iso": appt.start_time.isoformat(),
                "start_time_formatted": appt.start_time.strftime("%d/%m/%Y a las %H:%M hs"),
                "token_cancellation": appt.token_cancellation
            }
        }

    return {"has_active_appointment": False}

@router.post("/reschedule")
def reschedule_appointment(
    payload: RescheduleRequest,
    db: Session = Depends(get_db)
):
    """
    Reprograma un turno existente a un nuevo horario liberando la fecha anterior.
    """
    appt = db.query(Appointment).filter(Appointment.id == payload.appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Cita no encontrada")

    service = db.query(Service).filter(Service.id == appt.service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Tratamiento no encontrado")

    try:
        new_start_dt = datetime.fromisoformat(payload.new_start_time)
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de hora inválido")

    new_end_dt = new_start_dt + timedelta(minutes=service.duration_minutes)

    appt.start_time = new_start_dt
    appt.end_time = new_end_dt
    appt.status = "SCHEDULED"
    db.commit()

    return {
        "success": True,
        "message": f"Turno reprogramado exitosamente para el {new_start_dt.strftime('%d/%m a las %H:%M hs')}"
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
