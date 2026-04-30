from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(32), default="farmer", index=True)
    can_create_posts: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    expert_application_status: Mapped[str] = mapped_column(String(32), default="none", index=True)
    is_banned: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    banned_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    banned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    avatar_sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    scans = relationship("ScanHistory", back_populates="user", cascade="all,delete-orphan")
    community_likes = relationship("CommunityLike", back_populates="user", cascade="all,delete-orphan")
    community_comments = relationship("CommunityComment", back_populates="user", cascade="all,delete-orphan")
    community_comment_likes = relationship("CommunityCommentLike", back_populates="user", cascade="all,delete-orphan")
    notifications = relationship("Notification", foreign_keys="Notification.user_id", back_populates="user", cascade="all,delete-orphan")
    sent_notifications = relationship("Notification", foreign_keys="Notification.actor_user_id", back_populates="actor_user")
    sent_friend_requests = relationship("FriendRequest", foreign_keys="FriendRequest.sender_id", back_populates="sender", cascade="all,delete-orphan")
    received_friend_requests = relationship("FriendRequest", foreign_keys="FriendRequest.receiver_id", back_populates="receiver", cascade="all,delete-orphan")
    friendships_as_user_one = relationship("Friendship", foreign_keys="Friendship.user_one_id", back_populates="user_one", cascade="all,delete-orphan")
    friendships_as_user_two = relationship("Friendship", foreign_keys="Friendship.user_two_id", back_populates="user_two", cascade="all,delete-orphan")
    sent_direct_messages = relationship("DirectMessage", foreign_keys="DirectMessage.sender_id", back_populates="sender", cascade="all,delete-orphan")
    received_direct_messages = relationship("DirectMessage", foreign_keys="DirectMessage.receiver_id", back_populates="receiver", cascade="all,delete-orphan")
    expert_applications = relationship("ExpertApplication", foreign_keys="ExpertApplication.user_id", back_populates="user", cascade="all,delete-orphan")
    reviewed_expert_applications = relationship("ExpertApplication", foreign_keys="ExpertApplication.reviewed_by_user_id", back_populates="reviewed_by")
    submitted_reports = relationship("UserReport", foreign_keys="UserReport.reporter_user_id", back_populates="reporter", cascade="all,delete-orphan")
    received_reports = relationship("UserReport", foreign_keys="UserReport.target_user_id", back_populates="target_user", cascade="all,delete-orphan")
    reviewed_reports = relationship("UserReport", foreign_keys="UserReport.reviewed_by_user_id", back_populates="reviewed_by")
