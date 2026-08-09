import uuid
from sqlalchemy import Column, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base

class Patient(Base):
    __tablename__ = "patients"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    full_name = Column(String(100), nullable=False)
    whatsapp_phone = Column(String(20), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relaciones
    tenant = relationship("Tenant", back_populates="patients")
    appointments = relationship("Appointment", back_populates="patient")
