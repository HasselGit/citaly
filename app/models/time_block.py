from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey
from datetime import datetime
from app.db.session import Base

class TimeBlock(Base):
    __tablename__ = "time_blocks"

    id = Column(String(36), primary_key=True, index=True)
    tenant_id = Column(String(36), ForeignKey("tenants.id"), nullable=False, index=True)
    start_time = Column(DateTime, nullable=False, index=True)
    end_time = Column(DateTime, nullable=False, index=True)
    reason = Column(String(100), nullable=True)
    is_all_day = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
