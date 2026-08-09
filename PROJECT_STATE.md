# CITALY - DIRECTRICES Y ESTADO DEL PROYECTO (100% COMPLETADO)

> [!IMPORTANT]
> **ESTADO DEL PROYECTO AL 9 DE AGOSTO DE 2026**:
> - **TODAS LAS FASES COMPLETADAS (100% probadas y subidas a GitHub)**:
>   - ✅ FASE 1: Infraestructura Base, FastAPI, SQLAlchemy ORM & Supabase PostgreSQL.
>   - ✅ FASE 2: Motor de Reservas Atómico y Frontend Mobile-First con el Sistema de Diseño *Executive Precision*.
>   - ✅ FASE 3: Integración con Meta Cloud API (WhatsApp), Vercel Cron Jobs (24h/2h) y Webhooks de estado.
>   - ✅ FASE 4: Dashboard PWA Instalable para el Negocio con Manifiesto PWA y Service Worker.

---

## 📌 Repositorio de GitHub
- **URL del Repositorio:** [https://github.com/HasselGit/citaly](https://github.com/HasselGit/citaly)
- **Branch Principal:** `main`

---

## 🛠️ Stack Tecnológico Implementado
1. **Backend:** Python 3.14 + FastAPI + SQLAlchemy 2.0 ORM.
2. **Base de Datos:** PostgreSQL en **Supabase** (Project ID: `edkmkcxdtzygjjgvxgcq`, Región: `us-west-2` Oregon) con fallback a SQLite para desarrollo sin conexión.
3. **Despliegue Serverless:** **Vercel (Hobby Free Tier)** configurado en [vercel.json](file:///c:/Users/Usuario/Desktop/Citaly/vercel.json) con **Vercel Cron Jobs** en `/api/v1/cron/send-reminders`.
4. **Notificaciones Automatizadas:** Meta Cloud API (`app/services/whatsapp.py`) con simulación automática si no hay credenciales locales configuradas.
5. **Sistema de Diseño (Stitch MCP):** **Executive Precision** (Fondo Claro Clinical Snow `#F9FAFB`, Azul Titanio `#0F172A`, Ámbar Cálido `#D97706`, Tipografías *Hanken Grotesk* y *Work Sans*).

---

## 📁 Archivos Clave del Proyecto
- [.env](file:///c:/Users/Usuario/Desktop/Citaly/.env): Variables de entorno locales con las credenciales de Supabase. *(Ignorado en Git por seguridad)*.
- [.env.example](file:///c:/Users/Usuario/Desktop/Citaly/.env.example): Plantilla pública para desarrollo.
- [main.py](file:///c:/Users/Usuario/Desktop/Citaly/main.py): Punto de entrada FastAPI con middleware de subdominios (`*.citaly.com`), CORS y montaje de estáticos.
- [app/services/booking.py](file:///c:/Users/Usuario/Desktop/Citaly/app/services/booking.py): Motor de cálculo atómico de horarios disponibles y deshabilitación por solapamiento según duración (30m, 45m, 1h, 2h).
- [app/services/whatsapp.py](file:///c:/Users/Usuario/Desktop/Citaly/app/services/whatsapp.py): Cliente de comunicación con Meta Cloud API (WhatsApp Business API).
- [app/api/v1/endpoints/booking.py](file:///c:/Users/Usuario/Desktop/Citaly/app/api/v1/endpoints/booking.py): Endpoints `/api/v1/booking/services`, `/availability`, `/appointments` y `/cancel/{token}`.
- [app/api/v1/endpoints/cron.py](file:///c:/Users/Usuario/Desktop/Citaly/app/api/v1/endpoints/cron.py): Endpoint `/api/v1/cron/send-reminders` invocado por Vercel Cron.
- [app/api/v1/endpoints/webhook.py](file:///c:/Users/Usuario/Desktop/Citaly/app/api/v1/endpoints/webhook.py): Webhook de verificación y recepción de eventos de WhatsApp.
- [static/index.html](file:///c:/Users/Usuario/Desktop/Citaly/static/index.html): Landing del paciente Mobile-First matching el diseño de Stitch.
- [static/dashboard.html](file:///c:/Users/Usuario/Desktop/Citaly/static/dashboard.html): Dashboard PWA de gestión del consultorio con métricas en vivo.
- [static/manifest.json](file:///c:/Users/Usuario/Desktop/Citaly/static/manifest.json) & [static/sw.js](file:///c:/Users/Usuario/Desktop/Citaly/static/sw.js): Manifiesto PWA y Service Worker.

---

## 🎯 Instrucciones para Pruebas Locales:

1. **Iniciar el servidor local**:
   ```bash
   python main.py
   ```
2. **Probar las interfaces**:
   * Landing del paciente: Acceder a `http://localhost:8000/static/index.html` (o `http://localhost:8000/api/health`).
   * Dashboard PWA del consultorio: Acceder a `http://localhost:8000/static/dashboard.html`.
