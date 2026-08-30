from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date, timedelta
import uuid
import re

from app.db.session import get_db
from app.models.tenant import Tenant
from app.models.service import Service
from app.models.patient import Patient
from app.models.appointment import Appointment
from app.models.whatsapp_log import WhatsAppLog
from app.services.booking import calculate_available_slots
from app.services.whatsapp import whatsapp_service

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
    reschedule_from_token: Optional[str] = None
    reschedule_from_id: Optional[str] = None

class RescheduleRequest(BaseModel):
    appointment_id: str
    new_start_time: str

# Helper para normalizar teléfonos
def clean_phone_digits(phone: str) -> str:
    digits = re.sub(r'\D', '', phone or '')
    return digits[-10:] if len(digits) >= 10 else digits

def get_or_create_primary_tenant(db: Session) -> Tenant:
    tenant = db.query(Tenant).first()
    if not tenant:
        tenant = Tenant(
            id=str(uuid.uuid4()),
            subdomain="dr-alejandro-perez",
            business_name="Consultorio Odontológico Dr. Pérez",
            owner_name="Dr. Alejandro Pérez",
            category="Odontología",
            whatsapp_number="+549230220875"
        )
        db.add(tenant)
        db.commit()
        db.refresh(tenant)

    # Asegurar que existan únicamente los 6 servicios oficiales
    seed_services = [
        ("Ortodoncia / Control", 120, 15000.0),
        ("Limpieza & Blanqueamiento", 45, 8000.0),
        ("Implante Dental & Cirugía", 90, 45000.0),
        ("Endodoncia / Conducto", 60, 22000.0),
        ("Extracción Muela de Juicio", 60, 18000.0),
        ("Consulta & Diagnóstico", 30, 5000.0)
    ]

    # Eliminar o desactivar viejos servicios de prueba (ej. svc-001, svc-002)
    old_test_services = db.query(Service).filter(
        Service.tenant_id == tenant.id,
        Service.id.in_(["svc-001", "svc-002", "svc-003"])
    ).all()
    for old_s in old_test_services:
        old_s.is_active = False
    db.commit()

    existing_services = db.query(Service).filter(
        Service.tenant_id == tenant.id,
        Service.is_active == True
    ).all()
    existing_names = [s.name for s in existing_services]

    for name, duration, price in seed_services:
        if name not in existing_names:
            db.add(Service(
                id=str(uuid.uuid4()),
                tenant_id=tenant.id,
                name=name,
                duration_minutes=duration,
                price=price,
                is_active=True
            ))
    db.commit()

    return tenant

# --- Endpoints ---

@router.get("/tenant-info", response_model=TenantOut)
def get_tenant_info(request: Request, db: Session = Depends(get_db)):
    tenant = get_or_create_primary_tenant(db)
    return tenant

@router.get("/services")
def get_services(request: Request, db: Session = Depends(get_db)):
    tenant = get_or_create_primary_tenant(db)
    existing_services = db.query(Service).filter(
        Service.tenant_id == tenant.id,
        Service.is_active == True
    ).all()

    return [
        {
            "id": s.id,
            "name": s.name,
            "duration_minutes": s.duration_minutes,
            "price": float(s.price) if s.price else 0.0
        }
        for s in existing_services
    ]

@router.get("/availability")
def get_availability(
    service_id: str,
    target_date_str: str, # YYYY-MM-DD
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    tenant = get_or_create_primary_tenant(db)

    try:
        target_date = date.fromisoformat(target_date_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido. Use YYYY-MM-DD")

    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"

    slots = calculate_available_slots(db, tenant.id, service_id, target_date)
    return {
        "subdomain": tenant.subdomain,
        "service_id": service_id,
        "date": target_date_str,
        "slots": slots
    }

@router.post("/appointments")
async def create_appointment(
    payload: AppointmentCreateRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    try:
        tenant = get_or_create_primary_tenant(db)

        # 1. Resolver el servicio solicitado
        service = db.query(Service).filter(
            Service.tenant_id == tenant.id,
            Service.id == payload.service_id
        ).first()

        if not service:
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

        try:
            start_dt = datetime.fromisoformat(payload.start_time)
        except ValueError:
            return JSONResponse(status_code=400, content={"success": False, "detail": "Formato de hora de inicio inválido"})

        end_dt = start_dt + timedelta(minutes=service.duration_minutes)

        # 2. Registrar o vincular al paciente
        target_digits = clean_phone_digits(payload.patient_whatsapp)
        patients = db.query(Patient).filter(Patient.tenant_id == tenant.id).all()
        patient = None
        for p in patients:
            if clean_phone_digits(p.whatsapp_phone) == target_digits:
                patient = p
                break

        if patient:
            if payload.patient_full_name and payload.patient_full_name.strip() and payload.patient_full_name.strip() != patient.full_name:
                patient.full_name = payload.patient_full_name.strip()
                db.commit()
                db.refresh(patient)
        else:
            patient = Patient(
                id=str(uuid.uuid4()),
                tenant_id=tenant.id,
                full_name=payload.patient_full_name.strip(),
                whatsapp_phone=payload.patient_whatsapp
            )
            db.add(patient)
            db.commit()
            db.refresh(patient)

        # 3. Si es una reprogramación, cancelar el turno anterior para LIBERAR su horario en la base de datos
        was_rescheduled = False
        old_appt = None
        if payload.reschedule_from_token:
            old_appt = db.query(Appointment).filter(Appointment.token_cancellation == payload.reschedule_from_token).first()
        elif payload.reschedule_from_id:
            old_appt = db.query(Appointment).filter(Appointment.id == payload.reschedule_from_id).first()

        if old_appt:
            old_appt.status = "CANCELLED"
            db.commit()
            was_rescheduled = True
            print(f"[REPROGRAMACION]: Turno anterior {old_appt.id} del {old_appt.start_time} marcado como CANCELLED. Horario liberado.")

        # 4. Crear la reserva del nuevo turno
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

        # 5. Enviar mensaje de WhatsApp vía Meta Cloud API
        start_time_str = appointment.start_time.strftime('%d/%m a las %H:%M hs')
        pwa_url = "https://citaly-six.vercel.app"

        if was_rescheduled:
            wa_text = (
                f"Hola {patient.full_name}, te confirmamos que tu turno en {tenant.business_name} "
                f"para {service.name} fue REPROGRAMADO para el día {start_time_str}.\n\n"
                f"• Para cancelar: respondé CANCELAR a este mensaje.\n"
                f"• Para reprogramar ingresá a: {pwa_url}"
            )
        else:
            wa_text = (
                f"Hola {patient.full_name}, te confirmamos tu turno en {tenant.business_name} "
                f"para {service.name} el día {start_time_str}.\n\n"
                f"• Para cancelar: respondé CANCELAR a este mensaje.\n"
                f"• Para reprogramar ingresá a: {pwa_url}"
            )

        # Enviar mensaje de texto personalizado con número de producción real al paciente.
        meta_result = await whatsapp_service.send_text_message(
            to_phone=patient.whatsapp_phone,
            text_body=wa_text
        )
        print(f"[WHATSAPP META RESULT] {meta_result}")

        # Si fue reprogramado, notificar también a la administración/dueño si tiene número activo
        if was_rescheduled and tenant.whatsapp_number and "000000" not in tenant.whatsapp_number and tenant.whatsapp_number != patient.whatsapp_phone:
            admin_text = (
                f"🔔 Aviso de Reprogramación:\n"
                f"El paciente {patient.full_name} ({patient.whatsapp_phone}) reprogramó su turno de {service.name} para el {start_time_str}."
            )
            try:
                await whatsapp_service.send_text_message(
                    to_phone=tenant.whatsapp_number,
                    text_body=admin_text
                )
            except Exception as adm_err:
                print(f"[WHATSAPP ADMIN ALERT ERR]: {adm_err}")

        meta_msg_id = None
        if isinstance(meta_result, dict) and "messages" in meta_result and len(meta_result["messages"]) > 0:
            meta_msg_id = meta_result["messages"][0].get("id")

        # 6. Registrar log de WhatsApp inicial en base de datos
        wa_log = WhatsAppLog(
            id=str(uuid.uuid4()),
            appointment_id=appointment.id,
            message_type="RESCHEDULE_CONFIRM" if was_rescheduled else "CONFIRMATION",
            status="SENT" if meta_result.get("status") != "ERROR" else "FAILED",
            meta_message_id=meta_msg_id
        )
        db.add(wa_log)
        db.commit()

        msg_title = "¡Turno Reprogramado con Éxito!" if was_rescheduled else "¡Turno Agendado con Éxito!"
        msg_body = f"Tu nuevo turno para {service.name} fue registrado para el {start_time_str}." if was_rescheduled else f"Tu turno para {service.name} fue registrado para el {start_time_str}."

        return {
            "success": True,
            "appointment_id": appointment.id,
            "business_name": tenant.business_name,
            "service_name": service.name if service else "Consulta",
            "patient_name": patient.full_name,
            "start_time": appointment.start_time.isoformat(),
            "cancellation_token": token_cancel,
            "was_rescheduled": was_rescheduled,
            "message_title": msg_title,
            "message_body": msg_body,
            "whatsapp_status": meta_result.get("status", "SENT"),
            "whatsapp_preview": wa_text
        }
    except Exception as e:
        db.rollback()
        print(f"[ERROR APPOINTMENT]: {e}")
        return JSONResponse(status_code=400, content={"success": False, "detail": f"No se pudo guardar la cita: {str(e)}"})

@router.get("/appointments")
def get_appointments(request: Request, db: Session = Depends(get_db)):
    """
    Retorna la lista completa de turnos agendados para el Dashboard Administrativo.
    """
    appts = db.query(Appointment).order_by(Appointment.start_time.asc()).all()
    
    result = []
    for a in appts:
        patient = db.query(Patient).filter(Patient.id == a.patient_id).first()
        service = db.query(Service).filter(Service.id == a.service_id).first()
        result.append({
            "id": a.id,
            "patient_name": patient.full_name if patient else "Paciente",
            "patient_whatsapp": patient.whatsapp_phone if patient else "",
            "service_name": service.name if service else "Especialidad",
            "duration_minutes": service.duration_minutes if service else 30,
            "start_time": a.start_time.isoformat(),
            "time_str": a.start_time.strftime("%H:%M"),
            "status": a.status,
            "token_cancellation": a.token_cancellation
        })

    return result

@router.get("/my-appointment")
def get_my_appointment(
    phone: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Busca todas las citas activas futuras de un paciente por número de celular.
    Retorna una lista de turnos agendados en orden cronológico.
    """
    tenant = get_or_create_primary_tenant(db)
    target_digits = clean_phone_digits(phone)
    if not target_digits or len(target_digits) < 6:
        return {"has_active_appointment": False, "appointments": []}

    # Buscar paciente por teléfono normalizado
    patients = db.query(Patient).filter(Patient.tenant_id == tenant.id).all()
    matched_patient = None
    for p in patients:
        if clean_phone_digits(p.whatsapp_phone) == target_digits:
            matched_patient = p
            break

    if not matched_patient:
        return {"has_active_appointment": False, "appointments": []}

    # Buscar todas las citas activas futuras
    now = datetime.utcnow()
    appts = db.query(Appointment).filter(
        Appointment.tenant_id == tenant.id,
        Appointment.patient_id == matched_patient.id,
        Appointment.status.in_(["SCHEDULED", "CONFIRMED"]),
        Appointment.start_time >= now
    ).order_by(Appointment.start_time.asc()).all()

    if not appts:
        return {"has_active_appointment": False, "appointments": []}

    appointments_list = []
    for appt in appts:
        service = db.query(Service).filter(Service.id == appt.service_id).first()
        appointments_list.append({
            "id": appt.id,
            "patient_name": matched_patient.full_name,
            "service_id": service.id if service else "",
            "service_name": service.name if service else "Especialidad",
            "duration_minutes": service.duration_minutes if service else 30,
            "start_time_iso": appt.start_time.isoformat(),
            "date_formatted": appt.start_time.strftime("%d/%m/%Y"),
            "time_formatted": appt.start_time.strftime("%H:%M hs"),
            "status": appt.status,
            "token_cancellation": appt.token_cancellation
        })

    return {
        "has_active_appointment": True,
        "appointments": appointments_list,
        # Compatibilidad retroactiva con appointment único
        "appointment": appointments_list[0]
    }



@router.post("/reschedule")
def reschedule_appointment(
    payload: RescheduleRequest,
    db: Session = Depends(get_db)
):
    appt = db.query(Appointment).filter(Appointment.id == payload.appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Cita no encontrada")

    service = db.query(Service).filter(Service.id == appt.service_id).first()

    try:
        new_start_dt = datetime.fromisoformat(payload.new_start_time)
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de hora inválido")

    new_end_dt = new_start_dt + timedelta(minutes=service.duration_minutes if service else 30)

    appt.start_time = new_start_dt
    appt.end_time = new_end_dt
    appt.status = "SCHEDULED"
    db.commit()

    return {
        "success": True,
        "message": f"Turno reprogramado exitosamente para el {new_start_dt.strftime('%d/%m a las %H:%M hs')}"
    }

@router.get("/appointment/{token}")
def get_appointment_by_token(token: str, db: Session = Depends(get_db)):
    appointment = db.query(Appointment).filter(Appointment.token_cancellation == token).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Turno no encontrado")

    tenant = db.query(Tenant).filter(Tenant.id == appointment.tenant_id).first()
    patient = db.query(Patient).filter(Patient.id == appointment.patient_id).first()
    service = db.query(Service).filter(Service.id == appointment.service_id).first()

    start_dt = appointment.start_time
    date_str = start_dt.strftime("%d/%m/%Y")
    time_str = start_dt.strftime("%H:%M hs")

    return {
        "appointment_id": appointment.id,
        "tenant_id": appointment.tenant_id,
        "business_name": tenant.business_name if tenant else "Consultorio",
        "doctor_name": tenant.owner_name if tenant else "Profesional",
        "patient_name": patient.full_name if patient else "Paciente",
        "patient_whatsapp": patient.whatsapp_phone if patient else "",
        "service_id": service.id if service else "",
        "service_name": service.name if service else "Consulta",
        "duration_minutes": service.duration_minutes if service else 30,
        "start_time_iso": start_dt.isoformat(),
        "date_formatted": date_str,
        "time_formatted": time_str,
        "status": appointment.status,
        "token_cancellation": appointment.token_cancellation
    }

@router.post("/confirm/{token}")
def confirm_appointment(token: str, db: Session = Depends(get_db)):
    appointment = db.query(Appointment).filter(Appointment.token_cancellation == token).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Turno no encontrado")

    appointment.status = "CONFIRMED"
    db.commit()

    return {
        "success": True,
        "message": "Tu asistencia ha sido confirmada con éxito. ¡Te esperamos!"
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
        "message": "Turno cancelado exitosamente."
    }
