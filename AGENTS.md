# AGENTS.md - Directrices del Sistema y Blueprint Estructural (Citaly)

Este documento contiene las reglas de arquitectura, infraestructura, base de datos, UX/UI, endpoints backend y flujos de trabajo necesarias para que cualquier Agente de IA pueda reproducir, mantener o extender este proyecto hasta el más mínimo detalle desde el principio sin introducir regresiones.

**Última actualización:** 2026-08-30 (guarda-todo - Cierre de Sesión)

---

## 🏛️ 1. Arquitectura de Infraestructura y Despliegue

### Despliegue en Vercel (Serverless Free Tier)
- **URL de Producción Única:** `https://citaly-six.vercel.app` (No crear proyectos adicionales en Vercel).
- **Framework Backend:** FastAPI (Python 3.12).
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

## 🎨 3. Reglas de UX/UI, Concurrencia y Sincronización en Vivo

### Sistema Tipográfico Oficial Unificado (100% de la plataforma)
- **Títulos y Display (`font-display`):** `Montserrat` (Pesos: 600, 700, 800)
- **Cuerpo, Formularios y Botones (`font-sans`):** `Inter` (Pesos: 400, 500, 600)
- **Fechas, Horarios y Badges (`font-mono`):** `JetBrains Mono` (Pesos: 500, 600, 700)

### Frontend Paciente (PWA)
1. **Live Slot Refresh en Tiempo Real:**
   - La PWA consulta la disponibilidad en segundo plano cada 5 segundos y ante eventos de `visibilitychange`.
   - Si otro paciente reserva o cancela, los botones de horarios se deshabilitan/habilitan automáticamente en pantalla **sin recargar la página**.
2. **Protección Anti-Colisión Atómica (HTTP 409):**
   - El backend valida solapamientos antes de insertar en base de datos. Si ocurre un intento simultáneo en el mismo milisegundo, responde `409 Conflict` evitando duplicaciones.
3. **Reserva y Reprogramación Atómica:**
   - Al reprogramar, la cita anterior pasa a `status = 'CANCELLED'` en la misma transacción de PostgreSQL, liberando de inmediato el horario viejo.
   - Autocompletado de datos del paciente (`patient_name`, `patient_whatsapp`).
4. **Consulta de Turnos por Celular (`.active-appt-card`):**
   - Tarjeta blanca `#FFFFFF` con borde `#E2E8F0` y radio `16px`.
   - Botón Titanium Navy (`#0F172A`) para reprogramar y ghost para cancelar.

### Dashboard Ejecutivo (`/dashboard`)
1. **Estética Minimalista High-End (Stitch MCP):**
   - Paleta: Titanium Navy (`#0F172A`), Soft Canvas (`#F8FAFC`), Tarjetas Blancas (`#FFFFFF`), Acentos Ámbar (`#D97706`).
   - Sin líneas divisorias duras en la barra superior, lateral o inferior móvil.
2. **Sticky Headers (Encabezados Adhesivos):**
   - La cabecera de "Turnos del Día" y la de la "Agenda" se clavan en `sticky top-16 z-20 bg-white` al deslizar la página, manteniendo visible el contexto en todo momento.
3. **Depuración y Filtro de Horarios Pasados en Agenda:**
   - Los horarios pasados que nadie reservó hoy **no se renderizan**, dejando la grilla limpia.
   - El filtro `[ Libres ]` solo muestra slots verdaderamente reservables de ahora en adelante.
4. **Ventana de Historial de Turnos Pasados (Últimos 7 Días):**
   - Las vistas de `Tarjetas` y `Tabla` solo listan turnos pasados de los últimos 7 días hacia atrás para consultas médicas recientes. Turnos anteriores quedan archivados.
5. **Métricas Bento con Selector de Período:**
   - `[ Esta Semana ]` (7 días corridos) / `[ Este Mes ]` (30 días corridos).
   - Medición de Ocupación Real (`Turnos Activos / Capacidad Total * 100`) y tarjeta de Cancelados.

---

## 📲 4. Integración WhatsApp (Meta Cloud API)

### Arquitectura de Envío
- **Servicio:** `app/services/whatsapp.py` → clase `WhatsAppService`
- **Número Emisor (Producción Chip Propio):** `+54 9 2302 64-0284` (Phone Number ID: `1284438344753210`)
- **WABA ID:** `1006525879102174` (Plantillas) / `965775717869143` (TuTurno)
- **App ID Meta:** `2060755134547559`
- **Token:** Long-lived user token, 59 días, **vence 26/10/2026**
- **URL Base:** `https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages`

### Estado de Plantillas en Meta (WABA: `1006525879102174`)
- `citaly_confirmacion_v1` (`es_AR`): ⏳ `PENDING` (En revisión de Meta)
- `citaly_recordatorio_24h_v1` (`es_AR`): ⏳ `PENDING` (En revisión de Meta)
- `citaly_recordatorio_2h_v1` (`es_AR`): ⏳ `PENDING` (En revisión de Meta)
- `hello_world` (`en_US`): ✅ `APPROVED` (Aprobada)

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

# 2. Diagnóstico WhatsApp
Invoke-RestMethod -Uri "https://citaly-six.vercel.app/api/debug-whatsapp" | ConvertTo-Json -Depth 10

# 3. Consultar estado de plantillas Meta
python scratch/check_templates_status.py
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
| `WHATSAPP_PHONE_NUMBER_ID` | `1284438344753210` |
| `WABA_ID` | `1006525879102174` |
| `WHATSAPP_VERIFY_TOKEN` | `citaly_verify_token_2026` |
| `META_APP_ID` | `2060755134547559` |
| `META_APP_SECRET` | (en `.env` local, no compartir) |

---

## 📁 7. Estructura de Archivos Clave

```
Citaly/
├── main.py                                      # FastAPI app, rutas raíz, /api/health, /api/debug-whatsapp
├── app/
│   ├── core/config.py                           # Settings: DATABASE_URL, WHATSAPP_TOKEN, etc.
│   ├── db/session.py                            # SQLAlchemy engine con NullPool, get_db()
│   ├── models/                                  # ORM: tenant, service, patient, appointment, whatsapp_log
│   ├── api/v1/endpoints/
│   │   ├── booking.py                           # CRUD turnos, disponibilidad, reprogramación atómica, 409 anti-collision
│   │   ├── webhook.py                           # Webhook Meta: CANCELAR/CONFIRMAR del paciente
│   │   └── cron.py                              # Recordatorios automáticos 24h/2h
│   └── services/
│       ├── booking.py                           # Cálculo de slots disponibles
│       └── whatsapp.py                          # WhatsAppService: send_template_message, send_text_message
├── static/
│   ├── index.html                               # PWA paciente (Montserrat + Inter)
│   ├── dashboard.html                           # Dashboard ejecutivo Stitch con Sticky Headers y filtros
│   ├── cancel.html                              # Gestión/cancelación por token
│   ├── css/styles.css                           # Estilos globales unificados (Montserrat + Inter)
│   ├── js/app.js                                # Lógica PWA paciente (Live slot sync en 2do plano)
│   ├── js/dashboard.js                          # Lógica dashboard (métricas, sticky, filtros, 7d history window)
│   └── sw.js                                    # Service Worker PWA (cache: citaly-v41-clean-agenda)
├── scratch/
│   ├── check_templates_status.py                # Consulta de plantillas en Meta Cloud API
│   ├── create_word_guide.py                     # Generador de guía de arquitectura Multi-Tenant
│   ├── exchange_token.py                        # Intercambiar token corto → 59 días
│   └── check_token_expiry.py                    # Verificar vencimiento del token actual
├── Guia_Arquitectura_Multi_Negocio_Citaly.docx  # Documento Word ejecutivo de escalamiento SaaS
├── .env                                         # Variables locales (NO commitear)
├── AGENTS.md                                    # Blueprint estructural del sistema
├── vercel.json                                  # Configuración Vercel serverless
└── requirements.txt                             # Dependencias Python
```
