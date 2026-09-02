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
from app.models.time_block import TimeBlock
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
    service_id: Optional[str] = None
    start_time: str # ISO string: YYYY-MM-DDTHH:MM:SS
    patient_full_name: Optional[str] = None
    patient_name: Optional[str] = None
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

@router.get("/check-patient")
def check_patient(phone: str, service_id: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Verifica si un paciente ya cuenta con un turno activo para el mismo servicio.
    """
    tenant = get_or_create_primary_tenant(db)
    target_digits = clean_phone_digits(phone)
    if not target_digits:
        return {"has_active_appointment": False}

    patients = db.query(Patient).filter(Patient.tenant_id == tenant.id).all()
    patient = None
    for p in patients:
        if clean_phone_digits(p.whatsapp_phone) == target_digits:
            patient = p
            break

    if not patient:
        return {"has_active_appointment": False}

    now_dt = datetime.utcnow()
    query = db.query(Appointment).filter(
        Appointment.patient_id == patient.id,
        Appointment.status != "CANCELLED",
        Appointment.start_time >= now_dt
    )

    if service_id:
        query = query.filter(Appointment.service_id == service_id)

    appt = query.order_by(Appointment.start_time.asc()).first()
    if not appt:
        return {"has_active_appointment": False}

    srv = db.query(Service).filter(Service.id == appt.service_id).first()
    return {
        "has_active_appointment": True,
        "appointment": {
            "id": appt.id,
            "patient_name": patient.full_name,
            "patient_whatsapp": patient.whatsapp_phone,
            "service_id": appt.service_id,
            "service_name": srv.name if srv else "Consulta",
            "start_time_iso": appt.start_time.isoformat(),
            "start_time_formatted": appt.start_time.strftime('%d/%m a las %H:%M hs'),
            "token_cancellation": appt.token_cancellation
        }
    }

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
        service = None
        if payload.service_id:
            service = db.query(Service).filter(
                Service.tenant_id == tenant.id,
                Service.id == payload.service_id
            ).first()

            if not service:
                slug_map = {
                    "srv-ortodoncia": "Ortodoncia / Control",
                    "srv-limpieza": "Limpieza & Blanqueamiento",
                    "srv-endodoncia": "Endodoncia / Conducto",
                    "srv-implante": "Implante Dental & Cirugía",
                    "srv-extraccion": "Extracción Muela de Juicio",
                    "srv-consulta": "Consulta & Diagnóstico"
                }
                target_name = slug_map.get(payload.service_id)
                if target_name:
                    service = db.query(Service).filter(
                        Service.tenant_id == tenant.id,
                        Service.name.ilike(f"%{target_name}%")
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

        p_name = (payload.patient_full_name or payload.patient_name or "Paciente").strip()
        if patient:
            if p_name and p_name != patient.full_name:
                patient.full_name = p_name
                db.commit()
                db.refresh(patient)
        else:
            patient = Patient(
                id=str(uuid.uuid4()),
                tenant_id=tenant.id,
                full_name=p_name,
                whatsapp_phone=payload.patient_whatsapp
            )
            db.add(patient)
            db.commit()
            db.refresh(patient)

        # 3. Si NO es reprogramación, verificar si el paciente ya tiene un turno activo para este MISMO servicio
        now_dt = datetime.utcnow()
        if not payload.reschedule_from_token and not payload.reschedule_from_id and patient:
            existing_same_service_appt = db.query(Appointment).filter(
                Appointment.patient_id == patient.id,
                Appointment.service_id == service.id,
                Appointment.status != "CANCELLED",
                Appointment.start_time >= now_dt
            ).order_by(Appointment.start_time.asc()).first()

            if existing_same_service_appt:
                existing_date_str = existing_same_service_appt.start_time.strftime('%d/%m a las %H:%M hs')
                return JSONResponse(
                    status_code=409,
                    content={
                        "success": False,
                        "has_existing_same_service": True,
                        "existing_appointment_id": existing_same_service_appt.id,
                        "existing_service_name": service.name,
                        "existing_date_str": existing_date_str,
                        "detail": f"Ya tenés un turno de {service.name} para el {existing_date_str}. ¿Deseás reprogramarlo por este nuevo horario?"
                    }
                )

        # 3.1. Si es una reprogramación, cancelar el turno anterior para LIBERAR su horario en la base de datos
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
        # 3.5. Validar solapamiento atómico concurrente (anti double-booking)
        overlapping_appt = db.query(Appointment).filter(
            Appointment.tenant_id == tenant.id,
            Appointment.status != "CANCELLED",
            Appointment.start_time < end_dt,
            Appointment.end_time > start_dt
        ).first()

        if overlapping_appt:
            return JSONResponse(
                status_code=409,
                content={
                    "success": False,
                    "detail": "El horario seleccionado acaba de ser reservado por otro paciente. Por favor, selecciona otro horario disponible."
                }
            )

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

        # 5. Enviar mensaje de WhatsApp oficial vía Meta Cloud API
        date_param = appointment.start_time.strftime('%d/%m')
        time_param = appointment.start_time.strftime('%H:%M')
        start_time_str = f"{date_param} a las {time_param} hs"

        template_params = [
            {"type": "text", "text": patient.full_name},
            {"type": "text", "text": tenant.business_name},
            {"type": "text", "text": service.name},
            {"type": "text", "text": date_param},
            {"type": "text", "text": time_param}
        ]

        template_name = "citaly_reprogramacion_v1" if was_rescheduled else "citaly_confirmacion_v1"

        meta_result = await whatsapp_service.send_template_message(
            to_phone=patient.whatsapp_phone,
            template_name=template_name,
            language_code="es_AR",
            parameters=template_params
        )
        print(f"[WHATSAPP META TEMPLATE RESULT] {meta_result}")

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

        wa_text = f"Plantilla oficial {template_name} enviada a {patient.whatsapp_phone}"
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
    Retorna la lista completa de turnos agendados para el Dashboard Administrativo,
    incluyendo detección de reprogramación e información para la vista semanal.
    """
    now_utc = datetime.utcnow()
    appts = db.query(Appointment).order_by(Appointment.start_time.asc()).all()
    
    result = []
    for a in appts:
        patient = db.query(Patient).filter(Patient.id == a.patient_id).first()
        service = db.query(Service).filter(Service.id == a.service_id).first()
        
        # Detectar si fue reprogramado consultando logs de WhatsApp
        reschedule_log = db.query(WhatsAppLog).filter(
            WhatsAppLog.appointment_id == a.id,
            WhatsAppLog.message_type == "RESCHEDULE_CONFIRM"
        ).first()

        is_past = (a.start_time < now_utc)
        
        result.append({
            "id": a.id,
            "service_id": a.service_id,
            "patient_name": patient.full_name if patient else "Paciente",
            "patient_whatsapp": patient.whatsapp_phone if patient else "",
            "service_name": service.name if service else "Especialidad",
            "duration_minutes": service.duration_minutes if service else 30,
            "start_time": a.start_time.isoformat(),
            "date_formatted": a.start_time.strftime("%d/%m/%Y"),
            "date_iso": a.start_time.strftime("%Y-%m-%d"),
            "time_str": a.start_time.strftime("%H:%M"),
            "time_formatted": a.start_time.strftime("%H:%M hs"),
            "status": a.status,
            "token_cancellation": a.token_cancellation,
            "was_rescheduled": bool(reschedule_log),
            "rescheduled_at": reschedule_log.sent_at.isoformat() if reschedule_log and reschedule_log.sent_at else None,
            "is_past": is_past
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

@router.get("/patients-search")
def search_patients(q: str = "", db: Session = Depends(get_db)):
    """
    Búsqueda rápida de pacientes frecuentes para autocompletado en el módulo de asignación de turnos.
    """
    query = (q or "").strip()
    if not query or len(query) < 2:
        return {"patients": []}

    tenant = get_or_create_primary_tenant(db)
    all_patients = db.query(Patient).filter(Patient.tenant_id == tenant.id).all()

    matches = []
    for p in all_patients:
        name_match = query.lower() in p.full_name.lower()
        phone_match = query in (p.whatsapp_phone or "")
        if name_match or phone_match:
            matches.append({
                "id": p.id,
                "full_name": p.full_name,
                "whatsapp_phone": p.whatsapp_phone
            })
            if len(matches) >= 5:
                break

    return {"patients": matches}

class CancelByIdRequest(BaseModel):
    appointment_id: str

@router.post("/cancel-by-id")
def cancel_appointment_by_id(payload: CancelByIdRequest, db: Session = Depends(get_db)):
    """
    Cancelación directa de cita por ID (usado desde la PWA del paciente y Dashboard).
    """
    appointment = db.query(Appointment).filter(Appointment.id == payload.appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Turno no encontrado o ya fue cancelado")

    appointment.status = "CANCELLED"
    db.commit()

    return {
        "success": True,
        "message": "Turno cancelado exitosamente."
    }

class TimeBlockCreateRequest(BaseModel):
    tenant_id: Optional[str] = None
    start_time: str
    end_time: str
    reason: Optional[str] = None
    is_all_day: Optional[bool] = False

@router.get("/time-blocks")
def get_time_blocks(db: Session = Depends(get_db)):
    """
    Lista todos los bloqueos de agenda activos del consultorio.
    """
    tenant = get_or_create_primary_tenant(db)
    blocks = db.query(TimeBlock).filter(TimeBlock.tenant_id == tenant.id).order_by(TimeBlock.start_time.asc()).all()
    res = []
    for b in blocks:
        res.append({
            "id": b.id,
            "tenant_id": b.tenant_id,
            "start_time": b.start_time.isoformat(),
            "end_time": b.end_time.isoformat(),
            "start_formatted": b.start_time.strftime("%d/%m/%Y"),
            "end_formatted": b.end_time.strftime("%d/%m/%Y"),
            "reason": b.reason or "Bloqueo de Agenda",
            "is_all_day": b.is_all_day,
            "created_at": b.created_at.isoformat() if b.created_at else None
        })
    return {"time_blocks": res}

@router.post("/time-blocks")
def create_time_block(payload: TimeBlockCreateRequest, db: Session = Depends(get_db)):
    """
    Crea un nuevo bloqueo de agenda (días completos o franja horaria).
    """
    tenant = get_or_create_primary_tenant(db)
    try:
        start_clean = payload.start_time.replace("Z", "").split(".")[0]
        end_clean = payload.end_time.replace("Z", "").split(".")[0]
        start_dt = datetime.fromisoformat(start_clean)
        end_dt = datetime.fromisoformat(end_clean)
    except Exception as parse_err:
        raise HTTPException(status_code=400, detail=f"Formato de fecha inválido: {parse_err}")

    block = TimeBlock(
        id=str(uuid.uuid4()),
        tenant_id=tenant.id,
        start_time=start_dt,
        end_time=end_dt,
        reason=payload.reason.strip() if payload.reason else "Horario Bloqueado",
        is_all_day=payload.is_all_day or False
    )
    db.add(block)
    db.commit()
    db.refresh(block)

    return {
        "success": True,
        "message": "Bloqueo de agenda creado exitosamente",
        "block": {
            "id": block.id,
            "start_time": block.start_time.isoformat(),
            "end_time": block.end_time.isoformat(),
            "reason": block.reason,
            "is_all_day": block.is_all_day
        }
    }

@router.delete("/time-blocks/{block_id}")
def delete_time_block(block_id: str, db: Session = Depends(get_db)):
    """
    Elimina/desbloquea un período de agenda.
    """
    block = db.query(TimeBlock).filter(TimeBlock.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Bloqueo no encontrado")

    db.delete(block)
    db.commit()

    return {
        "success": True,
        "message": "Bloqueo eliminado exitosamente."
    }
