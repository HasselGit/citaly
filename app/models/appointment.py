import uuid
from sqlalchemy import Column, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    service_id = Column(String(36), ForeignKey("services.id"), nullable=False)
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=False)
    
    start_time = Column(DateTime, nullable=False, index=True)
    end_time = Column(DateTime, nullable=False)
    status = Column(String(20), default="SCHEDULED") # SCHEDULED, CONFIRMED, CANCELLED, COMPLETED
    
    token_cancellation = Column(String(64), unique=True, index=True, default=lambda: uuid.uuid4().hex)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relaciones
    tenant = relationship("Tenant", back_populates="appointments")
    service = relationship("Service", back_populates="appointments")
    patient = relationship("Patient", back_populates="appointments")
    whatsapp_logs = relationship("WhatsAppLog", back_populates="appointment", cascade="all, delete-orphan")
