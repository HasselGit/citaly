# AGENTS.md - Directrices del Sistema para Agentes de IA (Citaly)

Este documento contiene las reglas de arquitectura, infraestructura, base de datos, UX/UI y flujos de trabajo necesarias para que cualquier Agente de IA pueda mantener, extender o reproducir este proyecto hasta este punto exacto sin introducir regresiones.

---

## 🏛️ 1. Arquitectura de Infraestructura

### Despliegue en Vercel (Serverless Free Tier)
- **Framework Backend:** FastAPI (Python 3.12/3.14).
- **Regla Crítica de Serverless:** **JAMÁS** ejecutar llamadas síncronas o bloqueantes a la base de datos durante la importación de módulos (ej. `init_db()` o `Base.metadata.create_all()` en `main.py` o `session.py`). Las funciones serverless congelan y rompen la invocación con *timeouts* (exit status 500 / context canceled).
- **Patrón de Conexión:** **Lazy Connection** vía `get_db()`. La conexión a la base de datos se realiza únicamente a nivel de *request*.

### Conexión a Base de Datos (Supabase PostgreSQL)
- **Host del Session Pooler:** `aws-1-us-west-2.pooler.supabase.com` en puerto `5432`.
- **Formato de URL obligatorio:**  
  `postgresql://postgres.[PROJECT_ID]:[PASSWORD]@aws-1-us-west-2.pooler.supabase.com:5432/postgres`
- **¿Por qué Session Pooler IPv4?** Vercel Serverless (Hobby Tier) **NO soporta IPv6** para llamadas salientes. El host directo (`db.[PROJECT_ID].supabase.co`) resuelve a IPv6 y falla con `Cannot assign requested address`. El pooler en `aws-1` traduce IPv4 de Vercel a Supabase.
- **NullPool mandatory:** `session.py` usa `poolclass=NullPool` para evitar agotar las conexiones de PostgreSQL en lambdas efímeras.
- **SQLite Fallback:** **Prohibido en producción / Vercel**. `/tmp` en Vercel es efímero y borraría las citas guardadas entre invocaciones.

---

## 🗄️ 2. Modelos ORM y Esquema de Base de Datos

Los modelos SQLAlchemy en `app/models/` son la fuente de verdad del esquema:

### `tenants`
- `id` (VARCHAR 36, PK)
- `subdomain` (VARCHAR 50, UNIQUE, INDEX)
- `business_name` (VARCHAR 100)
- `owner_name` (VARCHAR 100)
- `category` (VARCHAR 50)
- `whatsapp_number` (VARCHAR 20)
- `is_active` (BOOLEAN)
- `created_at` (TIMESTAMP)

### `services`
- `id` (VARCHAR 36, PK)
- `tenant_id` (VARCHAR 36, FK -> `tenants.id`)
- `name` (VARCHAR 100)
- `duration_minutes` (INTEGER)
- `price` (NUMERIC 10,2)
- `is_active` (BOOLEAN)

### `patients`
- `id` (VARCHAR 36, PK)
- `tenant_id` (VARCHAR 36, FK -> `tenants.id`)
- `full_name` (VARCHAR 100) — *Nota: No usar `name`*
- `whatsapp_phone` (VARCHAR 20, INDEX) — *Nota: No usar `phone`*
- `created_at` (TIMESTAMP)

### `appointments`
- `id` (VARCHAR 36, PK)
- `tenant_id` (VARCHAR 36, FK -> `tenants.id`)
- `service_id` (VARCHAR 36, FK -> `services.id`)
- `patient_id` (VARCHAR 36, FK -> `patients.id`)
- `start_time` (TIMESTAMP, INDEX)
- `end_time` (TIMESTAMP)
- `status` (VARCHAR 20) — (`SCHEDULED`, `CONFIRMED`, `CANCELLED`, `COMPLETED`)
- `token_cancellation` (VARCHAR 64, UNIQUE, INDEX)
- `created_at` (TIMESTAMP)

### `whatsapp_logs`
- `id` (VARCHAR 36, PK)
- `appointment_id` (VARCHAR 36, FK -> `appointments.id`)
- `message_type` (VARCHAR 20) — (`CONFIRMATION`, `REMINDER_24H`, `REMINDER_2H`)
- `status` (VARCHAR 20) — (`PENDING`, `SENT`, `DELIVERED`, `READ`, `FAILED`)
- `meta_message_id` (VARCHAR 100)
- `sent_at` (TIMESTAMP)

---

## 🎨 3. Reglas de UX/UI y Frontend (PWA)

1. **Patrón Colapsable de Tarjetas de Tratamiento:**
   - Al seleccionar un tratamiento en `index.html`, la tarjeta seleccionada colapsa/resume su vista para dar espacio al calendario y slots de horarios. **NO eliminar esta funcionalidad.**
2. **Acceso al Dashboard:**
   - El cliente/paciente **JAMÁS** debe tener enlace o acceso al `/dashboard`. El dashboard es exclusivo del profesional/doctor.
3. **Manejo de Errores e Indicadores de Carga:**
   - Los errores de conexión o reserva deben mostrarse dentro del banner `#modal-error-banner` de la tarjeta/modal con un diseño premium glassmorphism.
   - El botón de confirmación usa una animación sutil de barrido sin entorpecer el flujo.
4. **Reserva Atómica e Instantánea:**
   - El cálculo de solapamientos se realiza en `app/services/booking.py`. Si un turno se reserva, automáticamente el horario pasa a `is_available: false`.

---

## 🚀 4. Comandos de Despliegue y Verificación

### Despliegue a Producción (Vercel)
```bash
git add .
git commit -m "feat/fix: <descripción>"
git push origin main
npx vercel --prod --yes
```

### Verificación de Endpoints en Producción
```powershell
# 1. Health check & estado de DB
Invoke-WebRequest -Uri "https://citaly-six.vercel.app/api/health" -UseBasicParsing

# 2. Obtener lista de servicios
Invoke-WebRequest -Uri "https://citaly-six.vercel.app/api/v1/booking/services" -UseBasicParsing

# 3. Crear una cita de prueba
Invoke-WebRequest -Uri "https://citaly-six.vercel.app/api/v1/booking/appointments" -Method POST -ContentType "application/json" -Body '{"tenant_id":"demo-tenant-citaly-001","service_id":"svc-001","patient_full_name":"Test Usuario","patient_whatsapp":"+5491155551234","start_time":"2026-08-15T10:00:00","end_time":"2026-08-15T10:30:00"}' -UseBasicParsing

# 4. Verificar disponibilidad bloqueada
Invoke-WebRequest -Uri "https://citaly-six.vercel.app/api/v1/booking/availability?tenant_id=demo-tenant-citaly-001&service_id=svc-001&target_date_str=2026-08-15" -UseBasicParsing
```

---

## 🔑 5. Variables de Entorno Requeridas en Vercel
- `DATABASE_URL`: `postgresql://postgres.edkmkcxdtzygjjgvxgcq:ykDPIL5oyii2RT2w@aws-1-us-west-2.pooler.supabase.com:5432/postgres`
- `SUPABASE_PROJECT_ID`: `edkmkcxdtzygjjgvxgcq`
- `SUPABASE_URL`: `https://edkmkcxdtzygjjgvxgcq.supabase.co`
- `ENVIRONMENT`: `production`
