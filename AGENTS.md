# AGENTS.md - Directrices del Sistema y Blueprint Estructural (ProntoTurno App)

Este documento contiene las reglas de arquitectura, infraestructura, base de datos, UX/UI, endpoints backend y flujos de trabajo necesarias para que cualquier Agente de IA pueda reproducir, mantener o extender este proyecto hasta el más mínimo detalle desde el principio sin introducir regresiones.

**Última actualización:** 2026-09-03 (Rebrand a ProntoTurno App - Sesión Oficial)

---

## 🏛️ 1. Arquitectura de Infraestructura y Despliegue

### Despliegue en Vercel (Serverless Free Tier)
- **URL de Producción Única:** `https://citaly-six.vercel.app` (No crear proyectos adicionales en Vercel).
- **Framework Backend:** FastAPI (Python 3.12).
- **Regla Crítica Serverless:** **JAMÁS** ejecutar llamadas síncronas o bloqueantes a la base de datos durante la importación de módulos (ej. `init_db()` o `Base.metadata.create_all()` en `main.py` o `session.py`). Las funciones serverless congelan y rompen la invocación con timeouts (`exit status 500 / context canceled`).
- **Patrón de Conexión:** **Lazy Connection** vía `get_db()`. La conexión a PostgreSQL se realiza únicamente a nivel de request.
- **Enrutamiento Vercel (`vercel.json`):**
  - `/` ➔ `/static/index.html`
  - `/dashboard` ➔ `/static/dashboard.html`
  - `/r/(.*)` ➔ `/static/index.html?reschedule_token=$1` (Acceso directo 1-Tap Express a turnos, sin pantallas intermedias).
  - `/cancel/(.*)` ➔ `/static/cancel.html?token=$1`
  - `/api/(.*)` ➔ `main.py`

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

### `time_blocks`
- `id` (VARCHAR 36, PK)
- `tenant_id` (VARCHAR 36, FK -> `tenants.id`)
- `start_time` (TIMESTAMP, INDEX)
- `end_time` (TIMESTAMP, INDEX)
- `reason` (VARCHAR 100, opcional, ej: *"Vacaciones Dr. Pérez"*)
- `is_all_day` (BOOLEAN)
- `created_at` (TIMESTAMP)

---

## 🎨 3. Reglas de UX/UI, Concurrencia y Sincronización en Vivo

### Sistema Tipográfico Oficial Unificado (100% de la plataforma)
- **Títulos y Display (`font-display`):** `Montserrat` (Pesos: 600, 700, 800)
- **Cuerpo, Formularios y Botones (`font-sans`):** `Inter` (Pesos: 400, 500, 600)
- **Fechas, Horarios y Badges (`font-mono`):** `JetBrains Mono` (Pesos: 500, 600, 700)

### Frontend Paciente (PWA) & Dashboard Ejecutivo
1. **Regla de Negocio Anti-Duplicados por Especialidad:**
   - Un paciente **SÍ** puede tener turnos activos para **diferentes especialidades** (ej: *Ortodoncia* y *Limpieza*).
   - Un paciente **NO** puede tener dos turnos activos para el **mismo servicio**.
   - Si intenta agendar un segundo turno para el mismo servicio, el backend responde `409 Conflict` (`has_existing_same_service: true`).
   - Tanto en la PWA de pacientes como en el Dashboard administrativo, se abre un **Modal Ejecutivo de Detección de Turno Existente**:
     - `[ Sí, Reprogramar por esta nueva fecha ]`: Cancela el turno viejo, libera su horario en PostgreSQL de inmediato y confirma el nuevo de forma atómica.
     - `[ Cancelar mi turno actual ]`: Da de baja la cita previa liberando el slot.
     - `[ Conservar mi turno (Volver) ]`: Cierra el aviso y mantiene la cita original 100% intacta.
2. **Live Slot Refresh en Tiempo Real:**
   - La PWA consulta la disponibilidad en segundo plano cada 4 segundos y ante eventos de `visibilitychange`.
   - Si otro paciente reserva o cancela, los botones de horarios se deshabilitan/habilitan automáticamente en pantalla **sin recargar la página**.
3. **Protección Anti-Colisión Atómica (HTTP 409):**
   - El backend valida solapamientos antes de insertar en base de datos. Si ocurre un intento simultáneo en el mismo milisegundo, responde `409 Conflict` evitando duplicaciones.
4. **Flujo 1-Tap Express de Reprogramación (desde WhatsApp o Consulta):**
   - Al tocar el link tokenizado (`https://citaly-six.vercel.app/r/{token}`), el usuario entra **directamente a la vista de reserva sin páginas intermedias**.
   - La PWA precarga en memoria al paciente (`patient_name`, `patient_whatsapp`, `service_id`), oculta el selector de servicios y los campos de texto, e inserta el banner limpio con monograma oficial:  
     `Reprogramar Turno de [Nombre]` — `Tratamiento: [Servicio]` (`[ Paso Único ]`).
   - El paciente solo selecciona el nuevo día y horario disponible y presiona **`[ Confirmar Cambio de Turno ✔ ]`** directamente en 1 solo toque, sin volver a escribir datos ni pasar por modales de formulario.
   - Liberación de slot anterior y confirmación del nuevo ejecutadas de forma atómica en PostgreSQL con despacho de notificación por WhatsApp.
5. **Branding Oficial de Plataforma:**
   - En modales de éxito, cancelaciones y respuestas de WhatsApp se exhibe la firma en color gris suave (`#94A3B8`) y en cursiva:  
     *`¡Gracias por elegirnos! • ProntoTurno App`*
6. **Consulta de Turnos por Celular (`.active-appt-card`):**
   - Tarjeta blanca `#FFFFFF` con borde `#E2E8F0` y radio `16px`.
   - Botón Titanium Navy (`#0F172A`) para reprogramar (activa modo 1-Tap Express) y ghost para cancelar.

### Dashboard Ejecutivo (`/dashboard`)
1. **Estética Minimalista High-End (Stitch MCP):**
   - Paleta: Titanium Navy (`#0F172A`), Soft Canvas (`#F8FAFC`), Tarjetas Blancas (`#FFFFFF`), Acentos Ámbar (`#D97706`), Neutral Slate (`#64748B`).
   - Sin líneas divisorias duras ni contrastes estridentes (sin verdes chillones ni rojos agresivos).
2. **Gestión Directa en la Agenda y Bloqueo de Disponibilidad:**
   - En turnos activos futuros, el médico dispone de un botón sobrio `[ Cancelar ]` con modal de confirmación (`#admin-cancel-appt-modal`) que libera el slot al instante.
   - En turnos que ya ocurrieron (`start_time < now`), el botón de cancelación se inhabilita automáticamente y se exhibe el badge neutral `Finalizado`.
   - **Módulo de Bloqueos (`#admin-block-modal`):** Permite inhabilitar días completos (ej. *Vacaciones del 15 al 21 de octubre*) o franjas horarias específicas, reflejándose en tiempo real en la web de pacientes y en la grilla de agenda con opción de `[ Desbloquear ]`.
3. **Búsqueda Global Multi-Fecha de Pacientes:**
   - Al tipear en el buscador de la Agenda, se despliega el panel superior `#agenda-search-results-panel` listando todos los turnos del paciente en cualquier fecha (historial y futuros) con acceso a gestión directa.
4. **Cálculo Continuo por Duración de Tratamiento:**
   - La grilla de la agenda y el motor de disponibilidad validan solapamiento de intervalos (`slotStart < apptEnd && slotEnd > apptStart`), bloqueando todos los slots que abarque el tratamiento (ej. 60 min -> 2 slots de 30 min).
5. **Módulo "+ Nuevo Turno":**
   - Permite a la administrativa o dueño agendar citas seleccionando servicio, día y slot disponible en tiempo real con autocompletado predictivo de pacientes (`/api/v1/booking/patients-search`).
   - Modal ejecutivo de detección de turno previo si el paciente ya posee cita para la misma especialidad (`#admin-duplicate-modal`).
6. **Barra Móvil Inferior Optimizada:**
   - 4 accesos rápidos (`Panel`, `+ Nuevo`, `Agenda`, `Reprog.`).
   - Íconos amplios de `26px × 26px` con tipografía clara `text-[11px] font-mono`.
   - Fondo `#F8FAFC` idéntico al lienzo, 100% sólido y opaco con micro-sombra en el botón activo.
7. **Módulo de Reprogramados Minimalista:**
   - Tarjetas individuales de un solo marco minimalista (`rounded-2xl border border-slate-200 shadow-2xs`), alineadas con los márgenes del resto de los módulos.
8. **Sticky Headers (Encabezados Adhesivos):**
   - La cabecera de "Turnos del Día" y la de la "Agenda" se clavan en `sticky top-16 z-20 bg-white` al deslizar la página, manteniendo visible el contexto en todo momento.
9. **Depuración y Filtro de Horarios Pasados en Agenda:**
   - Los horarios pasados que nadie reservó hoy **no se renderizan**, dejando la grilla limpia.
   - El filtro `[ Libres ]` solo muestra slots verdaderamente reservables de ahora en adelante.
10. **Ventana de Historial de Turnos Pasados (Últimos 7 Días):**
   - Las vistas de `Tarjetas` y `Tabla` solo listan turnos pasados de los últimos 7 días hacia atrás para consultas médicas recientes. Turnos anteriores quedan archivados.
11. **Métricas Bento con Selector de Período:**
   - `[ Esta Semana ]` (7 días corridos) / `[ Este Mes ]` (30 días corridos).
   - Medición de Ocupación Real (`Turnos Activos / Capacidad Total * 100`) y tarjeta de Cancelados.
12. **Grilla de Agenda en Columnas Verticales Continuas:**
   - Los slots del día se renderizan divididos en **2 columnas verticales continuas** (Columna Izquierda: primera mitad cronológica; Columna Derecha: segunda mitad cronológica).
   - Esto garantiza que los tratamientos con múltiples slots (ej: Ortodoncia de 120 min) aparezcan agrupados de forma **consecutiva vertical**, facilitando la lectura natural como en un libro de citas médico sin saltos en zig-zag.
13. **Modo Oscuro Oficial (Obsidian Gold & Industrial High-End):**
   - Lienzo Principal: Obsidian Charcoal (`#1D2524`), Tarjetas y Superficies: Dark Olive Slate (`rgba(37, 48, 46, 0.92)` / `#25302E` con bordes Muted Olive Gold `rgba(106, 106, 71, 0.35)`), Acento Principal & Botones Destacados: Vibrant Brass Gold (`#D6C265` con texto oscuro `#1D2524`), Estados Positivos/Disponibles: Sage Mint (`#749E90`), Reprogramación/Info: Steel Blue (`#557DA1`), Alertas/Bloqueos: Warm Bronze Umber (`#594B29`), Textos: Luminous Off-White (`#F4F4F6`), Textos Secundarios: Muted Slate (`#94A3B8` / `#A1A1AA`).
   - Botón toggle Luna 🌙 / Sol ☀️ ubicado en la barra superior al lado izquierdo del botón de actualización en vivo (`#theme-toggle` / `#theme-toggle-pwa`).
   - Persistencia automática en `localStorage` (`prontoturno_theme`) y detección inteligente inicial de `prefers-color-scheme`.
14. **Barra Lateral Desktop Integrada (Sin Bordes):**
   - La barra vertical de navegación del Dashboard utiliza fondo 100% integrado al lienzo (`bg-transparent`) y sin bordes divisorios (`border-0`), con botones activos en Brass Gold `#D6C265` y texto `#1D2524`.
15. **Barra de Estado del Sistema Android/iOS (Status Bar):**
   - `manifest.json` utiliza `background_color: #1D2524` y `theme_color: #1D2524` por defecto para prevenir destellos blancos en la barra de Android.
   - Tanto `dashboard.html` como `index.html` arrancan con `<meta name="theme-color" content="#1D2524">` y `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`, sincronizados dinámicamente con el tema del usuario.
16. **Secuencia de Splash Screen (Fondo Sólido Primero -> Aparición Ágil):**
   - Para evitar parpadeos, renderizados truncados de imágenes o recuadros estáticos, el splash screen cubre inmediatamente la pantalla con un fondo 100% sólido puro (`#1D2524` en oscuro / `#F8FAFC` en claro).
   - Inmediatamente (0.2s) se anima el desvanecimiento de entrada suave del isotipo oficial respirando y el texto *ProntoTurno App*.
   - El splash se descarta de forma rápida y ágil a los 1.4s totales sin demoras molestas.

---

## 📲 4. Integración WhatsApp (Meta Cloud API)

### Arquitectura de Envío
- **Servicio:** `app/services/whatsapp.py` → clase `WhatsAppService`
- **Número Emisor (Producción Chip Propio):** `+54 9 2302 64-0284` (Phone Number ID: `1284438344753210`)
- **WABA ID:** `985775717869143` (TuTurno / ProntoTurno App)
- **App ID Meta:** `2060755134547559`
- **Token:** Long-lived user token, 59 días, **vence 26/10/2026**
- **URL Base:** `https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages`
- **Plantillas Oficiales Aprobadas en Meta (`[APPROVED]`):**
  - `prontoturno_confirmacion_v1`
  - `prontoturno_reprogramacion_v1`
  - `prontoturno_cancelacion_v1`
  - `prontoturno_recordatorio_24h_v1`
  - `citaly_confirmacion_v1` (fallback secundario)

### Normalización Estricta de Teléfonos Argentinos (`normalize_whatsapp_phone`):
- Transforma automáticamente cualquier formato ingresado por el paciente (`02302 15 640284`, `2302-15-640284`, `011 15 5576 9048`, `+54 9 11 ...`) al estándar internacional exacto de Meta Cloud API: `549[cod_area_sin_0][numero_sin_15]` (13 dígitos).

### Mecanismo de Contingencia Automático (Fallback Garantizado):
- Meta Cloud API exige plantillas aprobadas (`[APPROVED]`) para contactar a cualquier usuario por primera vez o fuera de la ventana de 24h.
- Si una plantilla primaria devuelve error, el sistema reintenta inmediatamente con la plantilla secundaria aprobada (`citaly_confirmacion_v1`) antes de ir al fallback de texto.

### Regla de Bot Transaccional Multi-Negocio (Auto-Reply Redirection):
- Si el paciente escribe `CANCELAR` (o derivados) ➔ Cancela el turno y libera el slot en tiempo real con plantilla `prontoturno_cancelacion_v1`.
- Ante cualquier otro mensaje entrante ➔ El bot responde automáticamente redirigiendo al paciente al teléfono de contacto del consultorio (`tenant.whatsapp_number` o `2302 555555`):
  > *"Hola 👋 Este es el canal automático de notificaciones de ProntoTurno App.\n\nPara consultas o atención personalizada, por favor comunicate directamente con [Consultorio] al 📞 [Teléfono]."*

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
│   ├── models/                                  # ORM: tenant, service, patient, appointment, whatsapp_log, time_block
│   ├── api/v1/endpoints/
│   │   ├── booking.py                           # CRUD turnos, disponibilidad, reprogramación express, 409 anti-collision
│   │   ├── webhook.py                           # Webhook Meta: CANCELAR + Bot de redirección automática
│   │   └── cron.py                              # Recordatorios automáticos 24h
│   └── services/
│       ├── booking.py                           # Cálculo de slots disponibles y solapamientos
│       └── whatsapp.py                          # WhatsAppService con fallback garantizado a mensaje directo
├── static/
│   ├── index.html                               # PWA paciente (Montserrat + Inter, banner monograma)
│   ├── dashboard.html                           # Dashboard ejecutivo Stitch con Sticky Headers y filtros
│   ├── cancel.html                              # Gestión/cancelación por token
│   ├── css/styles.css                           # Estilos globales unificados (Montserrat + Inter)
│   ├── js/app.js                                # Lógica PWA paciente (1-Tap Express, Live slot sync)
│   ├── js/dashboard.js                          # Lógica dashboard (métricas, sticky, filtros, 7d history window)
│   └── sw.js                                    # Service Worker PWA (cache: citaly-v77-direct-r-reschedule-route)
├── scratch/
│   ├── check_templates_status.py                # Consulta de plantillas en Meta Cloud API
│   ├── create_word_guide.py                     # Generador de guía de arquitectura Multi-Tenant
│   ├── exchange_token.py                        # Intercambiar token corto → 59 días
│   └── check_token_expiry.py                    # Verificar vencimiento del token actual
├── Guia_Arquitectura_Multi_Negocio_Citaly.docx  # Documento Word ejecutivo de escalamiento SaaS
├── .env                                         # Variables locales (NO commitear)
├── AGENTS.md                                    # Blueprint estructural del sistema
├── vercel.json                                  # Configuración Vercel serverless y rutas
└── requirements.txt                             # Dependencias Python
```
