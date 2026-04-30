from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class UserReport(Base):
    __tablename__ = "user_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    reporter_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    target_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    post_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("scan_history.id", ondelete="CASCADE"), index=True, nullable=True)
    report_type: Mapped[str] = mapped_column(String(20), default="profile", index=True)
    reason: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="open", index=True)
    reviewed_by_user_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)

    reporter = relationship("User", foreign_keys=[reporter_user_id], back_populates="submitted_reports")
    target_user = relationship("User", foreign_keys=[target_user_id], back_populates="received_reports")
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_user_id], back_populates="reviewed_reports")
    post = relationship("ScanHistory", back_populates="reports")
