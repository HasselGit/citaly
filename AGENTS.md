# AGENTS.md - Directrices del Sistema y Blueprint Estructural (Citaly)

Este documento contiene las reglas de arquitectura, infraestructura, base de datos, UX/UI, endpoints backend y flujos de trabajo necesarias para que cualquier Agente de IA pueda reproducir, mantener o extender este proyecto hasta el más mínimo detalle desde el principio sin introducir regresiones.

**Última actualización:** 2026-08-30 (guarda-todo)

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

## 🎨 3. Reglas de UX/UI y Frontend (PWA & Dashboard)

### Sistema Tipográfico Oficial Unificado (100% de la plataforma)
- **Títulos y Display (`font-display`):** `Montserrat` (Pesos: 600, 700, 800)
- **Cuerpo, Formularios y Botones (`font-sans`):** `Inter` (Pesos: 400, 500, 600)
- **Fechas, Horarios y Badges (`font-mono`):** `JetBrains Mono` (Pesos: 500, 600, 700)

### Frontend Paciente (PWA)
1. **Patrón Colapsable de Tarjetas de Tratamiento:**
   - Al seleccionar un tratamiento en `index.html`, la tarjeta seleccionada colapsa/resume su vista para dar espacio al calendario y slots de horarios. **NO eliminar esta funcionalidad.**
2. **Reserva y Reprogramación Atómica:**
   - Al reprogramar (`reschedule_from_token` o `reschedule_from_id`), la cita anterior pasa automáticamente a `status = 'CANCELLED'` en PostgreSQL, liberando de inmediato el horario viejo para otros pacientes.
   - Autocompletado de datos: Al reprogramar, el sistema pre-carga automáticamente `patient_name` y `patient_whatsapp` en el formulario para que el usuario no deba reescribirlos.
3. **Consulta de Turnos por Celular (`.active-appt-card` — Diseño Minimalist Premium):**
   - Tarjeta `#FFFFFF` con borde sutil `#E2E8F0` y radio `16px`.
   - Cabecera limpia con nombre de servicio en negrita, paciente asociado y badge verde esmeralda `Agendado`.
   - Fila de Fecha y Horario con iconos minimalistas en caja gris suave `#F8FAFC`.
   - Botón primario de alta jerarquía Titanium Navy (`#0F172A`) para "Reprogramar fecha u horario" y botón sutil ghost para "Cancelar turno".
4. **Mensaje de Cancelación:**
   - Formato obligatorio: `Tu turno del DD/MM a las HH:MM hs fue cancelado. ¡Gracias por avisarnos!`.
5. **Normalización de Teléfonos (E.164 Argentina):**
   - El sistema acepta cualquier formato de entrada (`1155769048`, `91155769048`, `+5491155769048`, etc.)
   - `clean_phone_digits()` en `booking.py` extrae los últimos 10 dígitos para matching de pacientes.
   - `whatsapp.py` normaliza a E.164 (`5491155769048`) antes de llamar a Meta API.

### Dashboard Ejecutivo (`/dashboard`)
1. **Estética Minimalista High-End (Stitch MCP — TuTurno / Citaly Core):**
   - Paleta: Titanium Navy (`#0F172A`), Fondo Soft Canvas (`#F8FAFC`), Tarjetas Blancas Puras (`#FFFFFF`), Acentos Ámbar (`#D97706`) y Muted Slate (`#64748B`).
   - Sin colores estridentes ni líneas divisorias duras en la barra superior, lateral o barra inferior móvil.
   - Fondo de la barra superior `header` idéntico al canvas general (`#F8FAFC`).
2. **Resumen General (`#view-panel`):**
   - **Métricas Bento con Selector de Período:** `[ Esta Semana ]` (7 días corridos) / `[ Este Mes ]` (30 días corridos).
     - `Turnos Totales`
     - `Cancelados` (reemplaza Confirmados)
     - `Reprogramados` (contabiliza turnos con nueva fecha)
     - `Ocupación` (mide la capacidad real: `Turnos Activos / Total Slots de Capacidad * 100`).
   - **Módulo Turnos de Hoy:**
     - Encabezado con fecha dinámica completa.
     - Píldoras de filtro rápido por especialidad/tratamiento (`Ver Todos`, etc.).
     - Tabla minimalista con padding vertical holgado (`py-3.5`) y Sticky Header (`sticky top-16 z-20 bg-white`).
   - **Enlace Público y QR:** Sección integrada sin aspecto de tarjeta pesada, con el código QR alineado al lado del botón de copia.
3. **Agenda de Turnos (`#view-reservas`):**
   - Selector de días con botones limpios y conteo de turnos.
   - Modos de vista: `Agenda Diaria`, `Tarjetas` y `Tabla` con contraste nítido (`bg-navy text-white`).
   - **Grilla Horaria Diaria:**
     - Filtros de disponibilidad: `[ Todos ]`, `[ Libres ]`, `[ Ocupados ]`.
     - Sticky Header adhesivo (`sticky top-16 z-20 bg-white`) para el día seleccionado y los filtros al deslizar.
4. **Módulo de Turnos Reprogramados (`#view-reprogramados`):**
   - Pestaña dedicada con auto-expiración de turnos cumplidos (`start_time >= now`).
   - Badge numérico en la navegación móvil `[ 1 ]` anclado en la esquina superior derecha del ícono de `Reprog.`.
5. **Scroll Nativo y Holgura en Móvil:**
   - `body` con scroll nativo (`min-h-screen`, sin `overflow-hidden` ni trampas táctiles).
   - Padding inferior amplio (`pb-36`) para que la barra inferior móvil nunca tape el último elemento.

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

### Flujo de Cancelación y Reprogramación
- **Cancelación Directa por WhatsApp:** Al responder `CANCELAR`, el webhook localiza de forma determinista el `wamid` de la notificación o el turno del último mensaje enviado a ese número y lo cancela de inmediato liberando el slot en DB.
- **Enlace de Reprogramación Directo:** El mensaje de WhatsApp apunta directamente a la PWA principal (`https://citaly-six.vercel.app`), sin intermediarios.
- **Formato del Mensaje:**
  ```
  Hola {patient.full_name}, te confirmamos tu turno en {tenant.business_name} para {service.name} el día {DD/MM a las HH:MM hs}.

  • Para cancelar: respondé CANCELAR a este mensaje.
  • Para reprogramar ingresá a: https://citaly-six.vercel.app
  ```

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

# 3. Consultar estado de plantillas Meta
python scratch/check_templates_status.py

# 4. Crear una cita de prueba
$body = @{service_id="dummy";start_time="2026-09-01T10:00:00";patient_full_name="Test Usuario";patient_whatsapp="1155769048"} | ConvertTo-Json
Invoke-WebRequest -Uri "https://citaly-six.vercel.app/api/v1/booking/appointments" -Method POST -ContentType "application/json" -Body $body -UseBasicParsing
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
│   ├── index.html                   # PWA paciente (Montserrat + Inter)
│   ├── dashboard.html               # Dashboard ejecutivo Stitch con Sticky Headers y filtros
│   ├── cancel.html                  # Gestión/cancelación por token
│   ├── css/styles.css               # Estilos globales unificados (Montserrat + Inter)
│   ├── js/app.js                    # Lógica PWA paciente
│   ├── js/dashboard.js              # Lógica dashboard (métricas rolling 7d/30d, sticky, filtros)
│   └── sw.js                        # Service Worker PWA (cache: citaly-v39-sticky-headers-fix)
├── scratch/
│   ├── check_templates_status.py    # Consulta de plantillas en Meta Cloud API
│   ├── exchange_token.py            # Intercambiar token corto → 59 días
│   └── check_token_expiry.py        # Verificar vencimiento del token actual
├── .env                             # Variables locales (NO commitear)
├── AGENTS.md                        # Blueprint estructural del sistema
├── vercel.json                      # Configuración Vercel serverless
└── requirements.txt                 # Dependencias Python
```

---

## ⚡ 8. Estado Actual del Proyecto (al 30/08/2026)

### ✅ Funcionando al 100% en producción
- Reserva de turnos completa (PWA paciente → Backend FastAPI → PostgreSQL Supabase).
- Dashboard Ejecutivo Stitch Precision con:
  - TopNavBar y BottomNavBar integrados en fondo `#F8FAFC` sin líneas duras.
  - Sticky Headers adhesivos en "Turnos del Día" y "Agenda de Turnos".
  - Tabla de Turnos de Hoy con filtro por especialidad y espaciado perfecto.
  - Métricas Bento de 7 días corridos y 30 días con cálculo de Ocupación Real del Consultorio y tarjeta de Cancelados.
  - Filtros de disponibilidad en la Agenda (`Todos`, `Libres`, `Ocupados`).
  - Badge numérico nítido `[ 1 ]` anclado al ícono móvil de Reprogramados.
  - Sección QR compacta alineada al botón de reserva.
- Tipografía unificada en el 100% del proyecto (`Montserrat` + `Inter` + `JetBrains Mono`).
- Normalización telefónica argentina E.164 y webhook de WhatsApp para CANCELAR/CONFIRMAR.

### ⏳ En espera de Meta
- Aprobación de las 3 plantillas de Meta Cloud API (`citaly_confirmacion_v1`, `citaly_recordatorio_24h_v1`, `citaly_recordatorio_2h_v1`), actualmente en estado `PENDING`.
