from fastapi import APIRouter, Request, HTTPException, Query, Depends
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.whatsapp_log import WhatsAppLog

router = APIRouter(prefix="/api/v1/webhook", tags=["WhatsApp Webhook"])

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
    Recibe notificaciones de estado de mensajes (entregado, leído, fallido) desde WhatsApp.
    """
    data = await request.json()
    print("[WEBHOOK EVENT RECEIVED]:", data)

    # Procesar actualizaciones de estado de Meta (Statuses)
    try:
        entries = data.get("entry", [])
        for entry in entries:
            changes = entry.get("changes", [])
            for change in changes:
                value = change.get("value", {})
                statuses = value.get("statuses", [])
                
                for status_event in statuses:
                    wamid = status_event.get("id")
                    status_str = status_event.get("status") # sent, delivered, read, failed

                    if wamid and status_str:
                        log = db.query(WhatsAppLog).filter(WhatsAppLog.meta_message_id == wamid).first()
                        if log:
                            log.status = status_str.upper()
                            db.commit()
                            print(f"[STATUS UPDATED] Message {wamid} -> {status_str.upper()}")
    except Exception as e:
        print(f"[ERROR WEBHOOK PROCESS]: {e}")

    return {"status": "success"}
