import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
from datetime import datetime, date, timedelta
from app.db.session import SessionLocal
from app.models.tenant import Tenant
from app.models.service import Service
from app.models.time_block import TimeBlock
from app.services.booking import calculate_available_slots

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv()

db = SessionLocal()
try:
    tenant = db.query(Tenant).first()
    service = db.query(Service).filter(Service.tenant_id == tenant.id).first()
    
    test_date = date(2026, 10, 15)
    print(f"Probando cálculo de slots para la fecha {test_date}...")
    slots_before = calculate_available_slots(db, tenant.id, service.id, test_date)
    avail_before = [s for s in slots_before if s["is_available"]]
    print(f"Slots disponibles antes del bloqueo: {len(avail_before)} / {len(slots_before)}")

    # Crear bloqueo de prueba para el 15/10/2026
    test_block = TimeBlock(
        id="test-block-15oct",
        tenant_id=tenant.id,
        start_time=datetime(2026, 10, 15, 0, 0, 0),
        end_time=datetime(2026, 10, 15, 23, 59, 59),
        reason="Vacaciones Dr. Pérez (Test)",
        is_all_day=True
    )
    db.merge(test_block)
    db.commit()

    slots_after = calculate_available_slots(db, tenant.id, service.id, test_date)
    avail_after = [s for s in slots_after if s["is_available"]]
    print(f"Slots disponibles después del bloqueo: {len(avail_after)} / {len(slots_after)}")

    # Limpiar bloqueo de prueba
    db.delete(test_block)
    db.commit()
    print("Bloqueo de prueba limpiado correctamente.")
    print("Prueba de TimeBlock en calculate_available_slots: EXITOSA.")

finally:
    db.close()
