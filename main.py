import os
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, HTMLResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import engine, Base, get_db
from app.middleware.tenant import SubdomainTenantMiddleware
from app.models import Tenant, Service, Patient, Appointment, WhatsAppLog
from app.api.v1.endpoints.booking import router as booking_router
from app.api.v1.endpoints.cron import router as cron_router
from app.api.v1.endpoints.webhook import router as webhook_router

app = FastAPI(
    title=settings.APP_NAME,
    description="Plataforma SaaS Universal de Agendas Inteligentes y Reducción de Ausentismo por WhatsApp",
    version="1.0.0"
)

# Middleware de Subdominios Multi-tenant
app.add_middleware(SubdomainTenantMiddleware)

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"[GLOBAL EXCEPTION] {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Error interno del servidor", "error": str(exc)}
    )

# Registrar Routers
app.include_router(booking_router)
app.include_router(cron_router)
app.include_router(webhook_router)

# Montar archivos estáticos del frontend
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/api/health")
def health_check(request: Request, db: Session = Depends(get_db)):
    subdomain = getattr(request.state, "subdomain", "demo")
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "environment": settings.ENVIRONMENT,
        "active_subdomain": subdomain,
        "database": "connected"
    }

@app.get("/api/debug-whatsapp")
async def debug_whatsapp():
    """Diagnóstico: verifica token y envía plantilla REAL citaly_confirmacion_v1."""
    import httpx, re
    token = settings.WHATSAPP_TOKEN
    phone_id = settings.WHATSAPP_PHONE_NUMBER_ID
    raw_phone = "1155769048"
    digits = re.sub(r'\D', '', raw_phone)
    clean_phone = f"549{digits}" if len(digits) == 10 else digits

    token_preview = token[:20] + "..." if token else "VACIO"
    has_token = bool(token and token != "YOUR_META_WHATSAPP_API_TOKEN")

    result = {
        "phone_number_id": phone_id,
        "token_preview": token_preview,
        "has_valid_token": has_token,
        "clean_phone_to_send": clean_phone,
        "template_tested": "citaly_confirmacion_v1",
        "meta_response_template": None,
        "meta_response_hello": None
    }

    if has_token:
        url = f"https://graph.facebook.com/v18.0/{phone_id}/messages"
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

        # Test 1: plantilla real de producción
        payload_real = {
            "messaging_product": "whatsapp",
            "to": clean_phone,
            "type": "template",
            "template": {
                "name": "citaly_confirmacion_v1",
                "language": {"code": "es_AR"},
                "components": [{
                    "type": "body",
                    "parameters": [
                        {"type": "text", "text": "Hassel Test"},
                        {"type": "text", "text": "Citaly Odontología"},
                        {"type": "text", "text": "Consulta & Diagnóstico"},
                        {"type": "text", "text": "07/09"},
                        {"type": "text", "text": "09:00"}
                    ]
                }]
            }
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, headers=headers, json=payload_real)
            result["meta_response_template"] = {
                "status_code": resp.status_code,
                "body": resp.json() if resp.content else {}
            }

        # Test 2: hello_world (solo funciona con números de prueba, para diagnóstico)
        payload_hello = {
            "messaging_product": "whatsapp",
            "to": clean_phone,
            "type": "template",
            "template": {"name": "hello_world", "language": {"code": "en_US"}}
        }
        async with httpx.AsyncClient() as client:
            resp2 = await client.post(url, headers=headers, json=payload_hello)
            result["meta_response_hello"] = {
                "status_code": resp2.status_code,
                "body": resp2.json() if resp2.content else {}
            }

    return result


@app.get("/r/{token}")
def redirect_to_reschedule(token: str):
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=f"/?reschedule_token={token}", status_code=307)

@app.get("/dashboard")
def serve_dashboard(request: Request):
    from fastapi.responses import FileResponse
    if os.path.exists("static/dashboard.html"):
        return FileResponse("static/dashboard.html")
    return JSONResponse(status_code=404, content={"detail": "Página no encontrada"})

@app.get("/")
def read_root(request: Request):
    subdomain = getattr(request.state, "subdomain", "demo")
    return {
        "message": f"Bienvenido a Citaly - Agenda Inteligente ({subdomain})",
        "health_check": "/api/health",
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
