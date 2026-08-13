---
name: sincronizacion
description: "Revisa todos los avances, archivos estructurales (AGENTS.md, main.py, booking.py, webhook.py, cron.py), estado de Git, conexión a Supabase PostgreSQL y entorno de producción de Citaly para sincronizar el proyecto."
---

# Skill: Sincronización del Proyecto Citaly

Esta skill permite revisar el estado completo del proyecto Citaly, validar todos los archivos estructurales, el estado de Git, la salud del entorno en Vercel y la conexión a la base de datos Supabase, dejando el entorno sincronizado.

---

## Lógica de Ejecución

Cada vez que el usuario solicite la skill `sincronizacion` o pida sincronizar el proyecto:

### 1. Verificación de Control de Versiones (Git)
- Correr `git status` para comprobar que no existan cambios sin commitear o desincronizados.
- Correr `git log -n 5 --oneline` para revisar los últimos commits desplegados a producción.

### 2. Inspección de Archivos Estructurales Fuente de Verdad
- **`AGENTS.md`**: Validar directrices de arquitectura, variables de entorno, modelos SQLAlchemy (`tenants`, `services`, `patients`, `appointments`, `whatsapp_logs`) y reglas serverless (Session Pooler IPv4 en `aws-1-us-west-2.pooler.supabase.com:5432`, NullPool).
- **`main.py`**: Validar configuración de FastAPI, middleware multi-tenant, montaje estático y rutas HTML (`/r/{token}`, `/dashboard`).
- **`app/api/v1/endpoints/booking.py`**: Validar servicios oficiales (6 tarjetas), cálculo de disponibilidad sin reflows y endpoint multiturno `/my-appointment`.
- **`app/api/v1/endpoints/webhook.py`**: Validar recepción de Webhooks de WhatsApp y auto-cancelación limpia ante respuestas `"CANCELAR"`.
- **`app/api/v1/endpoints/cron.py`**: Validar cron job de recordatorios 24h y 2h.
- **Frontend (`static/index.html`, `static/js/app.js`, `static/css/styles.css`)**: Validar PWA con soporte multiturno, colapso de tarjeta de tratamiento y fijación de calendario sin saltos verticales.

### 3. Comprobación de Producción y Base de Datos
- Ejecutar verificación de estado contra la API desplegada en Vercel:
  - `https://citaly-six.vercel.app/api/health`
- Confirmar estado de la conexión a Supabase PostgreSQL.

### 4. Presentación del Informe de Sincronización
Generar una respuesta concisa y profesional con:
- Estado del backend, DB y despliegue Vercel.
- Resumen de los avances y funcionalidades vigentes.
- Confirmación de listo para continuar.
