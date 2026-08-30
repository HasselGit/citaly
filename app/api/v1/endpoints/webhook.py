import re
import uuid
from fastapi import APIRouter, Request, HTTPException, Query, Depends
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.config import settings
from app.db.session import get_db
from app.models.whatsapp_log import WhatsAppLog
from app.models.appointment import Appointment
from app.models.patient import Patient
from app.services.whatsapp import whatsapp_service

router = APIRouter(prefix="/api/v1/webhook", tags=["WhatsApp Webhook"])

def clean_digits(phone: str) -> str:
    if not phone:
        return ""
    return re.sub(r"\D", "", phone)

@router.get("/whatsapp")
def verify_meta_webhook(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
    hub_verify_token: str = Query(None, alias="hub.verify_token")
):
    """
    Endpoint de verificación exigido por Meta Developers al registrar el Webhook.
    """
    if hub_mode == "subscribe" and hub_verify_token == settings.WHATSAPP_VERIFY_TOKEN:
        print("[WEBHOOK META] Verificación exitosa del Webhook de WhatsApp!")
        return PlainTextResponse(content=hub_challenge)
    else:
        print("[WEBHOOK META] Fallo en la verificación del token")
        raise HTTPException(status_code=403, detail="Verification token mismatch")

@router.post("/whatsapp")
async def receive_meta_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Recibe notificaciones de estado y mensajes entrantes del paciente desde WhatsApp.
    Procesa respuestas como 'CANCELAR' para dar de baja la cita automáticamente.
    """
    data = await request.json()
    print("[WEBHOOK EVENT RECEIVED]:", data)

    try:
        entries = data.get("entry", [])
        for entry in entries:
            changes = entry.get("changes", [])
            for change in changes:
                value = change.get("value", {})
                
                # 1. Actualizaciones de estado de entregado/leído
                statuses = value.get("statuses", [])
                for status_event in statuses:
                    wamid = status_event.get("id")
                    status_str = status_event.get("status")
                    if wamid and status_str:
                        log = db.query(WhatsAppLog).filter(WhatsAppLog.meta_message_id == wamid).first()
                        if log:
                            log.status = status_str.upper()
                            db.commit()
                            print(f"[STATUS UPDATED] Message {wamid} -> {status_str.upper()}")

                # 2. Mensajes entrantes del paciente (Respuestas 'CANCELAR' o 'CONFIRMAR')
                messages = value.get("messages", [])
                for msg in messages:
                    sender_phone = msg.get("from", "")
                    msg_type = msg.get("type", "")
                    
                    body_text = ""
                    if msg_type == "text":
                        body_text = msg.get("text", {}).get("body", "")
                    elif msg_type == "button":
                        body_text = msg.get("button", {}).get("text", "") or msg.get("button", {}).get("payload", "")

                    clean_sender = clean_digits(sender_phone)
                    clean_body = body_text.strip().upper()

                    print(f"[WHATSAPP INCOMING] Sender: {sender_phone} ({clean_sender}) | Text: '{body_text}'")

                    # Buscar paciente por coincidencia de teléfono
                    all_patients = db.query(Patient).all()
                    matched_patients = [p for p in all_patients if clean_digits(p.whatsapp_phone).endswith(clean_sender[-10:]) or clean_sender.endswith(clean_digits(p.whatsapp_phone)[-10:])]

                    if matched_patients:
                        patient_ids = [p.id for p in matched_patients]

                        now_utc = datetime.utcnow()
                        context_wamid = msg.get("context", {}).get("id")

                        # A) Si el paciente responde CANCELAR
                        if any(k in clean_body for k in ["CANCELAR", "CANCEL", "DAR DE BAJA", "NO PUEDO"]):
                            appt_to_cancel = None

                            # 1. Si respondió directamente a un mensaje específico (context wamid)
                            if context_wamid:
                                ref_log = db.query(WhatsAppLog).filter(WhatsAppLog.meta_message_id == context_wamid).first()
                                if ref_log and ref_log.appointment_id:
                                    target = db.query(Appointment).filter(
                                        Appointment.id == ref_log.appointment_id,
                                        Appointment.status.in_(["SCHEDULED", "CONFIRMED", "REMINDER_SENT"])
                                    ).first()
                                    if target:
                                        appt_to_cancel = target

                            # 2. Si no hay context, buscar el turno del último mensaje de WhatsApp enviado
                            if not appt_to_cancel:
                                recent_log = db.query(WhatsAppLog).join(Appointment).filter(
                                    Appointment.patient_id.in_(patient_ids),
                                    Appointment.status.in_(["SCHEDULED", "CONFIRMED", "REMINDER_SENT"])
                                ).order_by(WhatsAppLog.sent_at.desc()).first()
                                if recent_log and recent_log.appointment_id:
                                    appt_to_cancel = db.query(Appointment).filter(
                                        Appointment.id == recent_log.appointment_id,
                                        Appointment.status.in_(["SCHEDULED", "CONFIRMED", "REMINDER_SENT"])
                                    ).first()

                            # 3. Fallback: turno futuro más próximo
                            if not appt_to_cancel:
                                active_appts = db.query(Appointment).filter(
                                    Appointment.patient_id.in_(patient_ids),
                                    Appointment.status.in_(["SCHEDULED", "CONFIRMED", "REMINDER_SENT"]),
                                    Appointment.start_time >= now_utc
                                ).order_by(Appointment.start_time.asc()).all()
                                if active_appts:
                                    appt_to_cancel = active_appts[0]

                            if appt_to_cancel:
                                appt_to_cancel.status = "CANCELLED"
                                db.commit()

                                start_dt = appt_to_cancel.start_time
                                date_str = start_dt.strftime("%d/%m")
                                time_str = start_dt.strftime("%H:%M")

                                reply_msg = f"Tu turno del {date_str} a las {time_str} hs fue cancelado. ¡Gracias por avisarnos!"
                                result = await whatsapp_service.send_text_message(to_phone=sender_phone, text_body=reply_msg)
                                
                                meta_id = None
                                if isinstance(result, dict) and "messages" in result and len(result["messages"]) > 0:
                                    meta_id = result["messages"][0].get("id")

                                log = WhatsAppLog(
                                    id=str(uuid.uuid4()),
                                    appointment_id=appt_to_cancel.id,
                                    message_type="AUTO_CANCEL_REPLY",
                                    status="SENT" if result.get("status") != "ERROR" else "FAILED",
                                    meta_message_id=meta_id
                                )
                                db.add(log)
                                db.commit()
                                print(f"[AUTO CANCELLED VIA WHATSAPP] Appointment {appt_to_cancel.id} ({date_str} {time_str}) cancelled by patient {sender_phone}")

                        # B) Si el paciente responde CONFIRMAR
                        elif any(k in clean_body for k in ["CONFIRMAR", "CONFIRMO", "OK", "SI", "SÍ", "ASISTO"]):
                            appt_to_confirm = None

                            if context_wamid:
                                ref_log = db.query(WhatsAppLog).filter(WhatsAppLog.meta_message_id == context_wamid).first()
                                if ref_log and ref_log.appointment_id:
                                    target = db.query(Appointment).filter(
                                        Appointment.id == ref_log.appointment_id,
                                        Appointment.status.in_(["SCHEDULED", "REMINDER_SENT"])
                                    ).first()
                                    if target:
                                        appt_to_confirm = target

                            if not appt_to_confirm:
                                recent_log = db.query(WhatsAppLog).join(Appointment).filter(
                                    Appointment.patient_id.in_(patient_ids),
                                    Appointment.status.in_(["SCHEDULED", "REMINDER_SENT"])
                                ).order_by(WhatsAppLog.sent_at.desc()).first()
                                if recent_log and recent_log.appointment_id:
                                    appt_to_confirm = db.query(Appointment).filter(
                                        Appointment.id == recent_log.appointment_id,
                                        Appointment.status.in_(["SCHEDULED", "REMINDER_SENT"])
                                    ).first()

                            if not appt_to_confirm:
                                active_appts = db.query(Appointment).filter(
                                    Appointment.patient_id.in_(patient_ids),
                                    Appointment.status.in_(["SCHEDULED", "REMINDER_SENT"]),
                                    Appointment.start_time >= now_utc
                                ).order_by(Appointment.start_time.asc()).all()
                                if active_appts:
                                    appt_to_confirm = active_appts[0]

                            if appt_to_confirm:
                                appt_to_confirm.status = "CONFIRMED"
                                db.commit()

                                start_dt = appt_to_confirm.start_time
                                date_str = start_dt.strftime("%d/%m")
                                time_str = start_dt.strftime("%H:%M")

                                reply_msg = f"¡Excelente! Tu turno del {date_str} a las {time_str} hs quedó confirmado. ¡Te esperamos!"
                                result = await whatsapp_service.send_text_message(to_phone=sender_phone, text_body=reply_msg)
                                
                                meta_id = None
                                if isinstance(result, dict) and "messages" in result and len(result["messages"]) > 0:
                                    meta_id = result["messages"][0].get("id")

                                log = WhatsAppLog(
                                    id=str(uuid.uuid4()),
                                    appointment_id=appt_to_confirm.id,
                                    message_type="AUTO_CONFIRM_REPLY",
                                    status="SENT" if result.get("status") != "ERROR" else "FAILED",
                                    meta_message_id=meta_id
                                )
                                db.add(log)
                                db.commit()
                                print(f"[AUTO CONFIRMED VIA WHATSAPP] Appointment {appt_to_confirm.id} confirmed by patient {sender_phone}")
                                result = await whatsapp_service.send_text_message(to_phone=sender_phone, text_body=reply_msg)
                                
                                meta_id = None
                                if isinstance(result, dict) and "messages" in result and len(result["messages"]) > 0:
                                    meta_id = result["messages"][0].get("id")

                                log = WhatsAppLog(
                                    id=str(uuid.uuid4()),
                                    appointment_id=appt_to_confirm.id,
                                    message_type="AUTO_CONFIRM_REPLY",
                                    status="SENT" if result.get("status") != "ERROR" else "FAILED",
                                    meta_message_id=meta_id
                                )
                                db.add(log)
                                db.commit()
                                print(f"[AUTO CONFIRMED VIA WHATSAPP] Appointment {appt_to_confirm.id} confirmed by patient {sender_phone}")
    except Exception as e:
        print(f"[ERROR WEBHOOK PROCESS]: {e}")

    return {"status": "success"}
