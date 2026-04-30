from datetime import datetime

from pydantic import BaseModel

from app.schemas.user import ExpertApplicationStatus, UserRole


class AdminUserSummaryResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: UserRole
    can_create_posts: bool
    expert_application_status: ExpertApplicationStatus
    is_banned: bool
    banned_reason: str | None = None
    created_at: datetime


class ExpertApplicationResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_email: str
    current_role: UserRole
    headline: str
    phone_number: str
    about: str
    credentials: str
    years_experience: int
    status: str
    review_notes: str | None = None
    created_at: datetime
    reviewed_at: datetime | None = None
    reviewed_by_user_id: str | None = None


class UserReportResponse(BaseModel):
    id: str
    report_type: str
    reason: str
    status: str
    created_at: datetime
    reporter_user_id: str
    reporter_user_name: str
    reporter_user_email: str
    target_user_id: str
    target_user_name: str
    target_user_email: str
    post_id: str | None = None
    reviewed_by_user_id: str | None = None
    reviewed_at: datetime | None = None


class AdminOverviewResponse(BaseModel):
    users: list[AdminUserSummaryResponse]
    expert_applications: list[ExpertApplicationResponse]
    reports: list[UserReportResponse]


class ExpertApplicationDecisionRequest(BaseModel):
    review_notes: str | None = None


class UserBanRequest(BaseModel):
    reason: str | None = None


class ReportCreateRequest(BaseModel):
    reason: str


class ReportStatusUpdateRequest(BaseModel):
    status: str
