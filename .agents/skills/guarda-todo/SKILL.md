---
name: guarda-todo
description: Actualiza exhaustivamente todos los archivos estructurales y directivas del proyecto Citaly (AGENTS.md, modelos SQLAlchemy, esquemas de BD, rutas backend, frontend PWA, dashboard, integraciones de WhatsApp y comandos de despliegue) para que cualquier Agente de IA pueda reproducir o extender el proyecto con precisión absoluta hasta el estado exacto actual.
---

# Skill: Guarda Todo (`guarda-todo`)

Esta habilidad debe ejecutarse cada vez que el usuario solicite **"guarda todo"**, **"guardar todo"**, **"actualiza los archivos estructurales"** o frases equivalentes.

---

## 🎯 Objetivo de la Skill
Garantizar que **absolutamente todos los avances, convenciones de código, modelos ORM, esquemas de base de datos, reglas de UX/UI, rutas backend y variables de entorno** queden registrados sin fallas en la documentación estructural ([`AGENTS.md`](file:///c:/Users/Usuario/Desktop/Citaly/AGENTS.md)), permitiendo a cualquier otro Agente de IA continuar o reconstruir el proyecto sin perder ningún detalle.

---

## 📋 Protocolo de Ejecución Paso a Paso

Cuando el Agente ejecute `guarda-todo`, debe llevar a cabo las siguientes acciones:

### 1. Auditoría del Código y Estado Actual
- **Modelos Backend:** Verificar `app/models/` (`tenant.py`, `service.py`, `patient.py`, `appointment.py`, `whatsapp_log.py`).
- **Endpoints FastAPI:** Confirmar rutas en `app/api/v1/endpoints/booking.py`, `cron.py`, `webhook.py` y `main.py`.
- **Servicios de Reserva:** Inspeccionar `app/services/booking.py` (cálculo de solapamiento, cancelación por token, reprogramación atómica).
- **Frontend PWA:** Revisar `static/index.html`, `static/js/app.js`, `static/css/styles.css` y `static/cancel.html`.
- **Dashboard Ejecutivo:** Revisar `static/dashboard.html` y `static/js/dashboard.js`.

### 2. Actualización de `AGENTS.md`
Reescribir o actualizar [`AGENTS.md`](file:///c:/Users/Usuario/Desktop/Citaly/AGENTS.md) con la siguiente estructura completa:
1. **Arquitectura e Infraestructura:** Vercel Hobby Serverless, Python 3.12, Supabase PostgreSQL IPv4 Session Pooler (`aws-1-us-west-2.pooler.supabase.com:5432`), NullPool, Lazy connection.
2. **Esquema de Base de Datos:** Tablas `tenants`, `services`, `patients`, `appointments`, `whatsapp_logs` con sus columnas y tipos exactos.
3. **Flujos de Trabajo Backend y Frontend:**
   - Reprogramación atómica con liberación de horario previo (`status = 'CANCELLED'`).
   - Autocompletado de datos del paciente en PWA (`patient_name`, `patient_whatsapp`).
   - Rediseño de tarjeta de consulta por celular (`.active-appt-card`) en PWA.
   - Dashboard Ejecutivo Stitch Executive Precision con vista dual (Tarjetas Apple Health / Tabla Ejecutiva) y gestión 100% automatizada (0 botones de borrado manual).
   - Formato exacto de respuestas y mensajes de WhatsApp.
4. **Comandos de Despliegue y Verificación en Vercel:** Comandos Git, Vercel CLI y llamadas PowerShell de prueba.
5. **Variables de Entorno.**

### 3. Commit, Push y Despliegue en Producción
Ejecutar los siguientes comandos en la terminal:
```bash
git add .
git commit -m "docs(structural): update AGENTS.md and project blueprints via guarda-todo skill"
git push origin main
npx vercel --prod --yes
```

---

## 💡 Reglas de Oro
- **Cero Omisiones:** No dejar de documentar ningún cambio técnico, endpoint nuevo o ajuste visual.
- **Single Deployment URL:** Toda referencia a la web de producción debe apuntar a `https://citaly-six.vercel.app`.
- **Automatización Total:** La documentación debe recalcar que la liberación de horarios en el Dashboard es 100% automática.
