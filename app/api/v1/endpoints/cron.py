from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import uuid

from app.db.session import get_db
from app.models.appointment import Appointment
from app.models.whatsapp_log import WhatsAppLog
from app.models.tenant import Tenant
from app.models.patient import Patient
from app.models.service import Service
from app.services.whatsapp import whatsapp_service

router = APIRouter(prefix="/api/v1/cron", tags=["Vercel Cron"])

@router.get("/send-reminders")
async def send_scheduled_reminders(db: Session = Depends(get_db)):
    """
    Endpoint invocado automáticamente por Vercel Cron Jobs (vercel.json) cada 15 minutos.
    Escanea turnos próximos y envía recordatorios oficiales de 24 horas por WhatsApp.
    """
    now = datetime.utcnow()
    processed_logs = []

    # Ventana de 24 horas (citas entre 23h 45m y 24h 15m a partir de ahora)
    win_24h_start = now + timedelta(hours=23, minutes=45)
    win_24h_end = now + timedelta(hours=24, minutes=15)

    appts_24h = db.query(Appointment).filter(
        Appointment.status.in_(["SCHEDULED", "CONFIRMED"]),
        Appointment.start_time >= win_24h_start,
        Appointment.start_time <= win_24h_end
    ).all()

    for appt in appts_24h:
        existing_log = db.query(WhatsAppLog).filter(
            WhatsAppLog.appointment_id == appt.id,
            WhatsAppLog.message_type == "REMINDER_24H"
        ).first()

        if not existing_log:
            tenant = db.query(Tenant).filter(Tenant.id == appt.tenant_id).first()
            patient = db.query(Patient).filter(Patient.id == appt.patient_id).first()
            service = db.query(Service).filter(Service.id == appt.service_id).first()

            if patient and tenant and service:
                start_dt = appt.start_time
                date_str = start_dt.strftime("%d/%m")
                time_str = start_dt.strftime("%H:%M")

                # Enviar plantilla oficial de Meta Cloud API
                result = await whatsapp_service.send_template_message(
                    to_phone=patient.whatsapp_phone,
                    template_name="citaly_recordatorio_24h_v1",
                    language_code="es_AR",
                    parameters=[
                        {"type": "text", "text": patient.full_name},
                        {"type": "text", "text": tenant.business_name},
                        {"type": "text", "text": service.name},
                        {"type": "text", "text": date_str},
                        {"type": "text", "text": time_str}
                    ],
                    token=appt.token_cancellation
                )

                meta_msg_id = None
                if isinstance(result, dict) and "messages" in result and len(result["messages"]) > 0:
                    meta_msg_id = result["messages"][0].get("id")

                log = WhatsAppLog(
                    id=str(uuid.uuid4()),
                    appointment_id=appt.id,
                    message_type="REMINDER_24H",
                    status="SENT" if result.get("status") != "ERROR" else "FAILED",
                    meta_message_id=meta_msg_id
                )
                db.add(log)
                processed_logs.append(f"REMINDER_24H -> {patient.full_name} ({appt.start_time.strftime('%d/%m %H:%M')})")

    db.commit()
    return {
        "status": "success",
        "processed_count": len(processed_logs),
        "details": processed_logs
    }
