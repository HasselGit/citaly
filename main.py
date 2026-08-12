import os
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, HTMLResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import engine, Base, get_db, init_db
from app.middleware.tenant import SubdomainTenantMiddleware
from app.models import Tenant, Service, Patient, Appointment, WhatsAppLog
from app.api.v1.endpoints.booking import router as booking_router
from app.api.v1.endpoints.cron import router as cron_router
from app.api.v1.endpoints.webhook import router as webhook_router

# Inicializar tablas en Supabase en arranque
init_db()

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
