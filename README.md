# CITALY - Plataforma SaaS Universal de Agendas Inteligentes & Reducción de Ausentismo por WhatsApp

> 🤖 **Directrices para Agentes de IA:** Consulta el archivo [PROJECT_STATE.md](file:///c:/Users/Usuario/Desktop/Citaly/PROJECT_STATE.md) para ver el estado exacto del desarrollo y las instrucciones de continuación.

---

Citaly es un sistema de agenda inteligente mobile-first diseñado para automatizar la reserva de turnos, el bloqueo dinámico de horarios por tratamiento/duración y la reducción del ausentismo mediante recordatorios automáticos por WhatsApp (**Meta Cloud API**).

---

## 🛠️ Stack Tecnológico
* **Backend:** Python (FastAPI 0.109+)
* **Base de Datos:** PostgreSQL en **Supabase** (Multi-tenant via SQLAlchemy 2.0 ORM)
* **Infraestructura & Hosting:** **Vercel (Hobby Free Tier)** + Vercel Cron Jobs
* **Notificaciones:** Meta Cloud API (WhatsApp Business API Directa)
* **Frontend:** PWA Mobile-First (HTML5, CSS3 Light Mode, JavaScript)

---

## 🚀 Guía de Instalación y Ejecución Local (Paso a Paso)

 CUALQUIER AGENTE DE IA O DESARROLLADOR PUEDE REPRODUCIR EL PROYECTO CON ESTOS PASOS:

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
Copia el archivo de plantilla `.env.example` a `.env`:
```bash
cp .env.example .env
```
Completa las variables con las credenciales de tu base de datos de Supabase y Meta Cloud API.

### 4. Iniciar el Servidor de Desarrollo
```bash
python main.py
# O usando uvicorn directamente:
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
├── .env.example         # Plantilla de variables de entorno requeridas
├── .gitignore           # Exclusión de archivos sensibles de Git
├── main.py              # Punto de entrada principal de FastAPI
├── requirements.txt     # Dependencias de Python
└── vercel.json          # Configuración de despliegue en Vercel & Cron Jobs
```

---

## 🔒 Licencia y Propiedad
Proyecto desarrollado para **HasselGit**. Todos los derechos reservados.
