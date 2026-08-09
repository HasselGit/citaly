import uuid
from sqlalchemy import Column, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base

class WhatsAppLog(Base):
    __tablename__ = "whatsapp_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    appointment_id = Column(String(36), ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False)
    message_type = Column(String(20), nullable=False) # 'CONFIRMATION', 'REMINDER_24H', 'REMINDER_2H'
    status = Column(String(20), default="SENT") # PENDING, SENT, DELIVERED, READ, FAILED
    meta_message_id = Column(String(100), nullable=True)
    sent_at = Column(DateTime, default=datetime.utcnow)

    # Relaciones
    appointment = relationship("Appointment", back_populates="whatsapp_logs")
