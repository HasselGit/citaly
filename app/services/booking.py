from datetime import datetime, date, time, timedelta, timezone
from typing import List, Dict, Any

from sqlalchemy.orm import Session

from app.models.service import Service
from app.models.appointment import Appointment


# Horario comercial por defecto: 09:00 a 18:00
DEFAULT_START_HOUR = 9
DEFAULT_END_HOUR = 18
ARGENTINA_TIMEZONE_OFFSET = timedelta(hours=-3)

def calculate_available_slots(
    db: Session,
    tenant_id: str,
    service_id: str,
    target_date: date
) -> List[Dict[str, Any]]:
    """
    Calcula los slots del día diferenciando entre DISPONIBLE y OCUPADO
    según la duración exacta del tratamiento.
    """
    # 1. Obtener el servicio para saber su duración (con fallback robusto)
    service = db.query(Service).filter(
        Service.tenant_id == tenant_id,
        Service.id == service_id
    ).first()

    if not service:
        service = db.query(Service).filter(Service.tenant_id == tenant_id).first()

    duration_minutes = service.duration_minutes if service else 30

    # 2. Obtener todas las citas existentes agendadas para el día (no canceladas)
    start_of_day = datetime.combine(target_date, time(0, 0, 0))
    end_of_day = datetime.combine(target_date, time(23, 59, 59))

    existing_appointments = db.query(Appointment).filter(
        Appointment.status != "CANCELLED",
        Appointment.start_time >= start_of_day,
        Appointment.start_time <= end_of_day
    ).all()

    # 3. Generar slots desde las 09:00 hasta las 18:00 en intervalos de 30 minutos
    slots = []
    current_time = datetime.combine(target_date, time(DEFAULT_START_HOUR, 0))
    closing_time = datetime.combine(target_date, time(DEFAULT_END_HOUR, 0))

    # Obtener fecha y hora local real en UTC-3
    now_local = datetime.now(timezone.utc) + ARGENTINA_TIMEZONE_OFFSET
    today_local = now_local.date()
    now_naive = now_local.replace(tzinfo=None)

    while current_time + timedelta(minutes=duration_minutes) <= closing_time:
        slot_start = current_time
        slot_end = current_time + timedelta(minutes=duration_minutes)

        # Verificar si la hora ya pasó en la fecha local real
        is_past = (target_date < today_local) or ((target_date == today_local) and (slot_start <= now_naive))

        # Verificar si solapa con alguna cita existente
        is_occupied = False
        if not is_past:
            for appt in existing_appointments:
                # Hay solapamiento si: slot_start < appt.end_time AND slot_end > appt.start_time
                if slot_start < appt.end_time and slot_end > appt.start_time:
                    is_occupied = True
                    break

        slots.append({
            "time_str": slot_start.strftime("%H:%M"),
            "start_iso": slot_start.isoformat(),
            "end_iso": slot_end.isoformat(),
            "is_available": not (is_occupied or is_past)
        })

        # Avanzar en intervalos de 30 min
        current_time += timedelta(minutes=30)

    return slots
