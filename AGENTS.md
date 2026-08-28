# AGENTS.md - Directrices del Sistema y Blueprint Estructural (Citaly)

Este documento contiene las reglas de arquitectura, infraestructura, base de datos, UX/UI, endpoints backend y flujos de trabajo necesarias para que cualquier Agente de IA pueda reproducir, mantener o extender este proyecto hasta el más mínimo detalle desde el principio sin introducir regresiones.

**Última actualización:** 2026-08-28 (guarda-todo)

---

## 🏛️ 1. Arquitectura de Infraestructura y Despliegue

### Despliegue en Vercel (Serverless Free Tier)
- **URL de Producción Única:** `https://citaly-six.vercel.app` (No crear proyectos adicionales en Vercel).
- **Framework Backend:** FastAPI (Python 3.12/3.14).
- **Regla Crítica Serverless:** **JAMÁS** ejecutar llamadas síncronas o bloqueantes a la base de datos durante la importación de módulos (ej. `init_db()` o `Base.metadata.create_all()` en `main.py` o `session.py`). Las funciones serverless congelan y rompen la invocación con timeouts (`exit status 500 / context canceled`).
- **Patrón de Conexión:** **Lazy Connection** vía `get_db()`. La conexión a PostgreSQL se realiza únicamente a nivel de request.

### Conexión a Base de Datos (Supabase PostgreSQL)
- **Host del Session Pooler:** `aws-1-us-west-2.pooler.supabase.com` en puerto `5432`.
- **Formato de URL obligatorio:**  
  `postgresql://postgres.edkmkcxdtzygjjgvxgcq:ykDPIL5oyii2RT2w@aws-1-us-west-2.pooler.supabase.com:5432/postgres`
- **¿Por qué Session Pooler IPv4?** Vercel Serverless (Hobby Tier) **NO soporta IPv6** para llamadas salientes. El host directo (`db.[PROJECT_ID].supabase.co`) resuelve a IPv6 y falla con `Cannot assign requested address`. El pooler en `aws-1` traduce IPv4 de Vercel a Supabase.
- **NullPool mandatory:** `session.py` usa `poolclass=NullPool` para evitar agotar las conexiones de PostgreSQL en lambdas efímeras.
- **SQLite Fallback:** **Prohibido en producción / Vercel**. `/tmp` en Vercel es efímero.

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
- `status` (VARCHAR 20) — (`SCHEDULED`, `CONFIRMED`, `REMINDER_SENT`, `CANCELLED`, `COMPLETED`)
- `token_cancellation` (VARCHAR 64, UNIQUE, INDEX)
- `created_at` (TIMESTAMP)

### `whatsapp_logs`
- `id` (VARCHAR 36, PK)
- `appointment_id` (VARCHAR 36, FK -> `appointments.id`)
- `message_type` (VARCHAR 20) — (`CONFIRMATION`, `RESCHEDULE_CONFIRM`, `REMINDER_24H`, `REMINDER_2H`)
- `status` (VARCHAR 20) — (`PENDING`, `SENT`, `DELIVERED`, `READ`, `FAILED`)
- `meta_message_id` (VARCHAR 100)
- `sent_at` (TIMESTAMP)

---

## 🎨 3. Reglas de UX/UI y Frontend (PWA & Dashboard)

### Frontend Paciente (PWA)
1. **Patrón Colapsable de Tarjetas de Tratamiento:**
   - Al seleccionar un tratamiento en `index.html`, la tarjeta seleccionada colapsa/resume su vista para dar espacio al calendario y slots de horarios. **NO eliminar esta funcionalidad.**
2. **Reserva y Reprogramación Atómica:**
   - Al reprogramar (`reschedule_from_token` o `reschedule_from_id`), la cita anterior pasa automáticamente a `status = 'CANCELLED'` en PostgreSQL, liberando de inmediato el horario viejo para otros pacientes.
   - Autocompletado de datos: Al reprogramar, el sistema pre-carga automáticamente `patient_name` y `patient_whatsapp` en el formulario para que el usuario no deba reescribirlos.
3. **Consulta de Turnos por Celular (`.active-appt-card`):**
   - Diseño claro, médico e intuitivo: Tarjeta `#FFFFFF`, borde superior `#D97706`, badge `#FEF3C7`, filas `#F8FAFC`, enlace directo a WhatsApp `https://wa.me/...`, botón rojo suave de cancelación y botón dorado de reprogramación.
4. **Mensaje de Cancelación:**
   - Formato obligatorio: `Tu turno del DD/MM a las HH:MM hs fue cancelado. ¡Gracias por avisarnos!`.
5. **Normalización de Teléfonos (E.164 Argentina):**
   - El sistema acepta cualquier formato de entrada (`1155769048`, `91155769048`, `+5491155769048`, etc.)
   - `clean_phone_digits()` en `booking.py` extrae los últimos 10 dígitos para matching de pacientes.
   - `whatsapp.py` normaliza a E.164 (`5491155769048`) antes de llamar a Meta API:
     - 10 dígitos → `549{digits}`
     - 11 dígitos empezando en `9` → `54{digits}`
     - 11 dígitos empezando en `0` → `549{digits[1:]}`

### Dashboard Ejecutivo (`/dashboard`)
1. **Estética Executive Precision (Stitch MCP):**
   - Paleta: Titanium Navy (`#0F172A`), Ámbar Dorado (`#D97706`), Soft Off-White (`#F8FAFC`), Esmeralda (`#10B981`).
   - Tipografía: `Hanken Grotesk` (títulos), `JetBrains Mono` (horarios/badgets), `Work Sans` (cuerpo).
2. **Acceso Restringido:**
   - El cliente/paciente **JAMÁS** debe tener enlace o acceso al `/dashboard`. El dashboard es exclusivo del profesional/doctor.
3. **Soporte Dual de Vistas:**
   - **Vista Tarjetas:** Módulos estilo Apple Health / Wallet optimizados para móviles y escritorio.
   - **Vista Tabla:** Tabla ejecutiva de alta densidad con columnas completas (`Paciente`, `Tratamiento`, `Fecha y Horario`, `Duración`, `Estado WhatsApp`).
4. **Gestión 100% Automatizada:**
   - Prohibido agregar botones manuales de "Liberar" o "Cancelar" en las tarjetas del Dashboard. La liberación es totalmente automática por el sistema.

---

## 📲 4. Integración WhatsApp (Meta Cloud API)

### Arquitectura de Envío
- **Servicio:** `app/services/whatsapp.py` → clase `WhatsAppService`
- **Número Emisor (Sandbox):** `+1 555-659-2482` (Phone Number ID: `1234817073057013`)
- **WABA ID:** `1006525879102174`
- **App ID Meta:** `2060755134547559`
- **Token:** Long-lived user token, 59 días, **vence 26/10/2026**
- **URL Base:** `https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages`

### Restricción Crítica del Sandbox de Meta
- Con el número de prueba (`+1 555-659-2482`), Meta **solo permite enviar mensajes a números verificados manualmente** en la consola de Meta Developers.
- La verificación se hace en: [https://developers.facebook.com/apps/2060755134547559/whatsapp-business/wa-dev-console/](https://developers.facebook.com/apps/2060755134547559/wa-dev-console/)
- **Paso para verificar receptor:** En "Destinatario" seleccionar número → hacer clic en "Enviar mensaje" → ingresar código OTP que llega por WhatsApp.
- Esta restricción **desaparece totalmente** al registrar un número de negocio real (chip propio) en el Paso 2 de Meta.

### Renovación del Token (cuando venza el 26/10/2026)
1. Ir a la consola de Meta → "Generar token" → copiar token corto
2. Ejecutar `scratch/exchange_token.py` con el nuevo token corto
3. Actualizar `WHATSAPP_TOKEN` en Vercel:
   ```powershell
   npx vercel env rm WHATSAPP_TOKEN production --yes
   echo "NUEVO_TOKEN" | npx vercel env add WHATSAPP_TOKEN production
   npx vercel --prod --yes
   ```

### Mensajes y Plantillas
- **Modo sandbox:** Solo se puede usar la plantilla `hello_world` (`en_US`) — Meta no permite texto libre como primer mensaje.
- **Modo producción (número real):** Usar `send_text_message()` con el texto personalizado completo que ya está construido en `booking.py`.
- **Texto de confirmación** (cuando haya número real):
  ```
  Hola {patient.full_name}, te confirmamos tu turno en {tenant.business_name}
  para el tratamiento de {service.name} el día {DD/MM a las HH:MM hs}.
  Si no podés asistir, respondé CANCELAR a este mensaje.
  Si deseás cambiar fecha u hora, reprogramá tu cita aquí: {reschedule_url}
  ```
- **Webhook entrante:** `/api/v1/webhook/meta` procesa respuestas `CANCELAR` (→ `CANCELLED`) y `CONFIRMAR` (→ `CONFIRMED`) del paciente.

### Próximo paso para producción real
1. Comprar chip prepago (cualquier operadora Argentina)
2. En Meta Developers → Paso 2: Configuración de producción → Agregar número de teléfono
3. Verificar con OTP
4. Actualizar `WHATSAPP_PHONE_NUMBER_ID` y `WHATSAPP_TOKEN` en Vercel
5. Cambiar `send_template_message("hello_world")` → `send_text_message(wa_text)` en `booking.py` línea 275

---

## 🚀 5. Comandos de Despliegue y Verificación

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

# 2. Diagnóstico WhatsApp (token + envío de prueba)
Invoke-RestMethod -Uri "https://citaly-six.vercel.app/api/debug-whatsapp" | ConvertTo-Json -Depth 10

# 3. Crear una cita de prueba
$body = @{service_id="dummy";start_time="2026-09-01T10:00:00";patient_full_name="Test Usuario";patient_whatsapp="1155769048"} | ConvertTo-Json
Invoke-WebRequest -Uri "https://citaly-six.vercel.app/api/v1/booking/appointments" -Method POST -ContentType "application/json" -Body $body -UseBasicParsing

# 4. Verificar disponibilidad
Invoke-WebRequest -Uri "https://citaly-six.vercel.app/api/v1/booking/availability?service_id=<ID>&target_date_str=2026-09-01" -UseBasicParsing
```

### Script de Intercambio de Token (renovación)
```powershell
# Desde c:\Users\Usuario\Desktop\Citaly\
$env:PYTHONIOENCODING="utf-8"
python scratch/exchange_token.py
```

---

## 🔑 6. Variables de Entorno Requeridas en Vercel

| Variable | Valor |
|---|---|
| `DATABASE_URL` | `postgresql://postgres.edkmkcxdtzygjjgvxgcq:ykDPIL5oyii2RT2w@aws-1-us-west-2.pooler.supabase.com:5432/postgres` |
| `SUPABASE_PROJECT_ID` | `edkmkcxdtzygjjgvxgcq` |
| `SUPABASE_URL` | `https://edkmkcxdtzygjjgvxgcq.supabase.co` |
| `ENVIRONMENT` | `production` |
| `WHATSAPP_TOKEN` | Long-lived token 59 días (vence 26/10/2026) |
| `WHATSAPP_PHONE_NUMBER_ID` | `1234817073057013` |
| `WABA_ID` | `1006525879102174` |
| `WHATSAPP_VERIFY_TOKEN` | `citaly_verify_token_2026` |
| `META_APP_ID` | `2060755134547559` |
| `META_APP_SECRET` | (en `.env` local, no compartir) |

---

## 📁 7. Estructura de Archivos Clave

```
Citaly/
├── main.py                          # FastAPI app, rutas raíz, /api/health, /api/debug-whatsapp
├── app/
│   ├── core/config.py               # Settings: DATABASE_URL, WHATSAPP_TOKEN, etc.
│   ├── db/session.py                # SQLAlchemy engine con NullPool, get_db()
│   ├── models/                      # ORM: tenant, service, patient, appointment, whatsapp_log
│   ├── api/v1/endpoints/
│   │   ├── booking.py               # CRUD turnos, disponibilidad, reprogramación atómica
│   │   ├── webhook.py               # Webhook Meta: CANCELAR/CONFIRMAR del paciente
│   │   └── cron.py                  # Recordatorios automáticos 24h/2h
│   └── services/
│       ├── booking.py               # Cálculo de slots disponibles
│       └── whatsapp.py              # WhatsAppService: send_template_message, send_text_message
├── static/
│   ├── index.html                   # PWA paciente
│   ├── dashboard.html               # Dashboard ejecutivo profesional
│   ├── cancel.html                  # Página de cancelación/reprogramación por token
│   ├── js/app.js                    # Lógica PWA
│   ├── js/dashboard.js              # Lógica dashboard (filtros, vista dual)
│   └── sw.js                        # Service Worker PWA (cache: citaly-v28-template-fix-sandbox)
├── scratch/
│   ├── exchange_token.py            # Intercambiar token corto → 59 días
│   ├── check_token_expiry.py        # Verificar vencimiento del token actual
│   └── debug_whatsapp_template.py   # Test directo de envío a Meta API
├── .env                             # Variables locales (NO commitear)
├── AGENTS.md                        # Este archivo
├── vercel.json                      # Configuración Vercel serverless
└── requirements.txt                 # Dependencias Python
```

---

## ⚡ 8. Estado Actual del Proyecto (al 28/08/2026)

### ✅ Funcionando en producción
- Reserva de turnos completa (PWA → Backend → PostgreSQL)
- Dashboard ejecutivo con vista dual (tarjetas + tabla)
- Cancelación por token (link en WhatsApp)
- Reprogramación atómica desde PWA y desde cancel.html
- Consulta de turnos por número de celular
- Normalización E.164 de teléfonos argentinos
- Webhook Meta para procesar CANCELAR/CONFIRMAR del paciente

### ⏳ Pendiente para producción completa
- **Número emisor real:** Comprar chip → registrar en Meta Paso 2 → actualizar env vars
- **Cambiar en `booking.py` línea 275:** `send_template_message("hello_world")` → `send_text_message(wa_text)` (texto personalizado completo ya construido)
- **Plantillas Meta aprobadas:** Crear `citaly_confirmacion_turno`, `citaly_recordatorio_24h`, `citaly_recordatorio_2h` para mensajes business-initiated
- **Recordatorios automáticos:** Vercel Cron ya configurado en `cron.py`, activar en `vercel.json`
