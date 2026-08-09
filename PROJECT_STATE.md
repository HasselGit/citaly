# CITALY - DIRECTRICES Y ESTADO DEL PROYECTO (GUÍA PARA AGENTES DE IA)

> [!IMPORTANT]
> **ESTADO DEL PROYECTO AL 8 DE AGOSTO DE 2026**:
> - **Fases Completadas (100% probadas y subidas a GitHub)**: FASE 1 (Infraestructura Base) y FASE 2 (Motor de Reservas Atómico y Frontend Mobile-First).
> - **Próxima Fase a Ejecutar**: FASE 3 (Integración de Meta Cloud API para WhatsApp y Tareas Programadas 24h / 2h).

---

## 📌 Repositorio de GitHub
- **URL del Repositorio:** [https://github.com/HasselGit/citaly](https://github.com/HasselGit/citaly)
- **Branch Principal:** `main`

---

## 🛠️ Stack Tecnológico Seleccionado y Configurado
1. **Backend:** Python 3.14 + FastAPI + SQLAlchemy 2.0 ORM.
2. **Base de Datos:** PostgreSQL en **Supabase** (Project ID: `edkmkcxdtzygjjgvxgcq`, Región: `us-west-2` Oregon).
3. **Despliegue y Serverless:** **Vercel (Hobby Free Tier)** configurado en [vercel.json](file:///c:/Users/Usuario/Desktop/Citaly/vercel.json) con **Vercel Cron Jobs** en `/api/v1/cron/send-reminders`.
4. **Sistema de Diseño (Stitch MCP):** **Executive Precision** (Fondo Claro Clinical Snow `#F9FAFB`, Azul Titanio `#0F172A`, Ámbar Cálido `#D97706`, Tipografías *Hanken Grotesk* y *Work Sans*).

---

## 📁 Archivos Clave del Proyecto
- [.env](file:///c:/Users/Usuario/Desktop/Citaly/.env): Variables de entorno locales con las credenciales de Supabase. *(Ignorado en Git por seguridad)*.
- [.env.example](file:///c:/Users/Usuario/Desktop/Citaly/.env.example): Plantilla pública para desarrollo.
- [main.py](file:///c:/Users/Usuario/Desktop/Citaly/main.py): Punto de entrada FastAPI con middleware de subdominios (`*.citaly.com`), CORS y montaje de estáticos.
- [app/services/booking.py](file:///c:/Users/Usuario/Desktop/Citaly/app/services/booking.py): Motor de cálculo atómico de horarios disponibles y deshabilitación por solapamiento según duración (30m, 45m, 1h, 2h).
- [app/api/v1/endpoints/booking.py](file:///c:/Users/Usuario/Desktop/Citaly/app/api/v1/endpoints/booking.py): Endpoints `/api/v1/booking/services`, `/availability`, `/appointments` y `/cancel/{token}`.
- [static/index.html](file:///c:/Users/Usuario/Desktop/Citaly/static/index.html): Landing del paciente Mobile-First matching el diseño de Stitch.
- [static/dashboard.html](file:///c:/Users/Usuario/Desktop/Citaly/static/dashboard.html): Dashboard PWA de gestión del consultorio con métricas en vivo.

---

## 🎯 Instrucciones para el Próximo Agente de IA (Mañana):

1. **Pasos para iniciar**:
   ```bash
   git pull origin main
   python -m pip install -r requirements.txt
   ```
2. **Cómo probar el estado actual**:
   ```bash
   python main.py
   ```
   * Landing del paciente: Acceder a `http://localhost:8000/static/index.html` (o `http://localhost:8000/api/health`).
   * Dashboard del consultorio: Acceder a `http://localhost:8000/static/dashboard.html`.

3. **Tarea Pendiente Inmediata (FASE 3)**:
   * Desarrollar `app/services/whatsapp.py` para el cliente de Meta Cloud API (Graph API).
   * Crear el endpoint cron `/api/v1/cron/send-reminders` para buscar turnos que requieran recordatorio de **24 horas** o **2 horas** antes y enviar la plantilla con el botón de reprogramación/cancelación en 1 click.
   * Desarrollar el Webhook de verificación e ingreso de respuestas en `app/api/v1/endpoints/webhook.py`.
