# CITALY - DIRECTRICES Y ESTADO DEL PROYECTO (100% COMPLETADO & VERIFICADO)

> [!IMPORTANT]
> **ESTADO DEL PROYECTO AL 11 DE AGOSTO DE 2026**:
> - **TODAS LAS FASES Y CORRECCIONES COMPLETADAS (100% verificado en producción)**:
>   - ✅ **FASE 1: Infraestructura Base, FastAPI, SQLAlchemy ORM & Supabase PostgreSQL.**
>     - Resuelto el problema de conexión en Vercel Serverless mediante el **Session Pooler IPv4** (`aws-1-us-west-2.pooler.supabase.com:5432`).
>     - Implementado el patrón **Lazy Connection** (conexión por request) eliminando bloqueos síncronos al arranque.
>   - ✅ **FASE 2: Motor de Reservas Atómico y Frontend Mobile-First.**
>     - Verificado en producción: la creación de cita en `POST /api/v1/booking/appointments` responde al instante y bloquea el horario en `GET /availability`.
>     - Restaurado el patrón visual colapsable de las tarjetas de tratamiento al seleccionar servicio.
>   - ✅ **FASE 3: Integración con Meta Cloud API (WhatsApp), Vercel Cron Jobs (24h/2h) y Webhooks.**
>   - ✅ **FASE 4: Dashboard PWA Instalable para el Negocio con Manifiesto PWA y Service Worker.**

---

## 📌 Repositorio de GitHub
- **URL del Repositorio:** [https://github.com/HasselGit/citaly](https://github.com/HasselGit/citaly)
- **Branch Principal:** `main`
- **Despliegue en Producción:** [https://citaly-six.vercel.app](https://citaly-six.vercel.app)

---

## 📖 Guías para Agentes de IA
- Consulta [AGENTS.md](file:///c:/Users/Usuario/Desktop/Citaly/AGENTS.md) para ver la guía técnica completa de arquitectura, modelos relacionales, reglas de Vercel/Supabase y comandos de prueba.

---

## 🛠️ Stack Tecnológico Implementado
1. **Backend:** Python 3.12/3.14 + FastAPI + SQLAlchemy 2.0 ORM + psycopg2.
2. **Base de Datos:** PostgreSQL en **Supabase** (Project ID: `edkmkcxdtzygjjgvxgcq`, Región: `us-west-2` Oregon) con Session Pooler en `aws-1-us-west-2.pooler.supabase.com:5432`.
3. **Despliegue Serverless:** **Vercel (Hobby Free Tier)** configurado en `vercel.json` con variables de entorno persistidas en el proyecto.
4. **Notificaciones Automatizadas:** Meta Cloud API (`app/services/whatsapp.py`) con simulación fallback.
5. **Sistema de Diseño (Stitch MCP):** Executive Precision Glassmorphism con paleta clínica premium.

---

## 📁 Archivos Clave del Proyecto
- [AGENTS.md](file:///c:/Users/Usuario/Desktop/Citaly/AGENTS.md): Directrices técnicas para desarrollo y agentes de IA.
- [.env.example](file:///c:/Users/Usuario/Desktop/Citaly/.env.example): Plantilla pública para desarrollo.
- [main.py](file:///c:/Users/Usuario/Desktop/Citaly/main.py): Punto de entrada FastAPI con middleware de subdominios (`*.citaly.com`), CORS y montaje de estáticos.
- [app/db/session.py](file:///c:/Users/Usuario/Desktop/Citaly/app/db/session.py): Configuración de SQLAlchemy con `NullPool` y conexión lazy.
- [app/services/booking.py](file:///c:/Users/Usuario/Desktop/Citaly/app/services/booking.py): Motor de cálculo atómico de horarios disponibles y deshabilitación por solapamiento según duración.
- [app/api/v1/endpoints/booking.py](file:///c:/Users/Usuario/Desktop/Citaly/app/api/v1/endpoints/booking.py): Endpoints `/services`, `/availability`, `/appointments` y `/cancel/{token}`.
- [static/index.html](file:///c:/Users/Usuario/Desktop/Citaly/static/index.html): Landing de reservas del paciente Mobile-First.
- [static/dashboard.html](file:///c:/Users/Usuario/Desktop/Citaly/static/dashboard.html): Dashboard PWA de gestión del consultorio.
