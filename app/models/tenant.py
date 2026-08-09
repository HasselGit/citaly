import uuid
from sqlalchemy import Column, String, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base

class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    subdomain = Column(String(50), unique=True, nullable=False, index=True) # ej: 'drperez'
    business_name = Column(String(100), nullable=False) # ej: 'Clínica Dental Dr. Pérez'
    owner_name = Column(String(100), nullable=False) # ej: 'Dr. Alejandro Pérez'
    category = Column(String(50), default="Odontología") # Odontología, Estética, Kinesiología, etc.
    whatsapp_number = Column(String(20), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relaciones
    services = relationship("Service", back_populates="tenant", cascade="all, delete-orphan")
    patients = relationship("Patient", back_populates="tenant", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="tenant", cascade="all, delete-orphan")
