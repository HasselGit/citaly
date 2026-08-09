import uuid
from sqlalchemy import Column, String, Integer, Numeric, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base

class Service(Base):
    __tablename__ = "services"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False) # ej: "Ortodoncia Control", "Limpieza & Blanqueamiento"
    duration_minutes = Column(Integer, nullable=False, default=30) # 30, 45, 60, 120 min
    price = Column(Numeric(10, 2), nullable=True) # Importe de referencia
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relaciones
    tenant = relationship("Tenant", back_populates="services")
    appointments = relationship("Appointment", back_populates="service")
