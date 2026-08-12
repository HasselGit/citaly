# CITALY - Plataforma SaaS Universal de Agendas Inteligentes & Reducción de Ausentismo por WhatsApp

> 🤖 **Directrices para Agentes de IA:** Consulta el archivo [AGENTS.md](file:///c:/Users/Usuario/Desktop/Citaly/AGENTS.md) para ver la arquitectura técnica, esquema de DB y reglas de desarrollo, y [PROJECT_STATE.md](file:///c:/Users/Usuario/Desktop/Citaly/PROJECT_STATE.md) para el estado del proyecto.

---

Citaly es un sistema de agenda inteligente mobile-first diseñado para automatizar la reserva de turnos, el bloqueo dinámico de horarios por tratamiento/duración y la reducción del ausentismo mediante recordatorios automáticos por WhatsApp (**Meta Cloud API**).

---

## 🛠️ Stack Tecnológico
* **Backend:** Python (FastAPI 0.109+)
* **Base de Datos:** PostgreSQL en **Supabase** (Multi-tenant via SQLAlchemy 2.0 ORM con Session Pooler IPv4)
* **Infraestructura & Hosting:** **Vercel (Hobby Free Tier)** + Vercel Cron Jobs
* **Notificaciones:** Meta Cloud API (WhatsApp Business API Directa)
* **Frontend:** PWA Mobile-First (HTML5, Glassmorphism CSS, JavaScript)

---

## 🚀 Guía de Instalación y Ejecución Local (Paso a Paso)

### 1. Clonar el Repositorio
```bash
git clone https://github.com/HasselGit/citaly.git
cd citaly
```

### 2. Configurar Entorno Virtual e Instalar Dependencias
```bash
python -m venv .venv
# En Windows (PowerShell):
.venv\Scripts\Activate.ps1
# En Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
```

### 3. Configurar Variables de Entorno (`.env`)
Copia el archivo de plantilla `.env.example` a `.env` y completa las variables de Supabase:
```bash
cp .env.example .env
```

### 4. Iniciar el Servidor de Desarrollo
```bash
python main.py
# O usando uvicorn:
uvicorn main:app --reload --port 8000
```

Navega a `http://localhost:8000/api/health` o a `http://localhost:8000/docs` para ver la documentación interactiva Swagger.

---

## 🗺️ Estructura del Proyecto

```text
citaly/
├── app/
│   ├── api/             # Endpoints HTTP (Booking, Cron, Webhooks)
│   ├── core/            # Configuración de variables de entorno (config.py)
│   ├── db/              # Sesión y motor de base de datos SQLAlchemy (session.py)
│   ├── middleware/      # Middleware de resolución de subdominios (tenant.py)
│   ├── models/          # Modelos relacionales ORM (Tenant, Service, Patient, Appointment, WhatsAppLog)
│   └── services/        # Lógica de reservas atómicas, WhatsApp API y schedulers
├── static/              # Archivos estáticos del Frontend PWA
├── AGENTS.md            # Directrices técnicas y arquitectura para Agentes de IA
├── PROJECT_STATE.md     # Estado detallado de avance del proyecto
├── vercel.json          # Configuración de despliegue en Vercel & Cron Jobs
└── main.py              # Punto de entrada principal de FastAPI
```

---

## 🔒 Licencia y Propiedad
Proyecto desarrollado para **HasselGit**. Todos los derechos reservados.
