from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.api.deps import require_roles
from app.db.session import get_session
from app.models.expert_application import ExpertApplication
from app.models.user import User
from app.models.user_report import UserReport
from app.schemas.admin import (
    AdminOverviewResponse,
    AdminUserSummaryResponse,
    ExpertApplicationDecisionRequest,
    ExpertApplicationResponse,
    ReportStatusUpdateRequest,
    UserBanRequest,
    UserReportResponse,
)
from app.services.notifications import create_notification

router = APIRouter(prefix="/admin", tags=["admin"])


def _serialize_user(user: User) -> AdminUserSummaryResponse:
    return AdminUserSummaryResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        can_create_posts=user.can_create_posts,
        expert_application_status=user.expert_application_status,
        is_banned=user.is_banned,
        banned_reason=user.banned_reason,
        created_at=user.created_at,
    )


def _serialize_application(application: ExpertApplication, user: User) -> ExpertApplicationResponse:
    return ExpertApplicationResponse(
        id=application.id,
        user_id=user.id,
        user_name=user.full_name,
        user_email=user.email,
        current_role=user.role,
        headline=application.headline,
        phone_number=application.phone_number,
        about=application.about,
        credentials=application.credentials,
        years_experience=application.years_experience,
        status=application.status,
        review_notes=application.review_notes,
        created_at=application.created_at,
        reviewed_at=application.reviewed_at,
        reviewed_by_user_id=application.reviewed_by_user_id,
    )


def _serialize_report(report: UserReport, reporter: User, target_user: User) -> UserReportResponse:
    return UserReportResponse(
        id=report.id,
        report_type=report.report_type,
        reason=report.reason,
        status=report.status,
        created_at=report.created_at,
        reporter_user_id=reporter.id,
        reporter_user_name=reporter.full_name,
        reporter_user_email=reporter.email,
        target_user_id=target_user.id,
        target_user_name=target_user.full_name,
        target_user_email=target_user.email,
        post_id=report.post_id,
        reviewed_by_user_id=report.reviewed_by_user_id,
        reviewed_at=report.reviewed_at,
    )


@router.get("/overview", response_model=AdminOverviewResponse)
async def get_admin_overview(
    _: User = Depends(require_roles("admin", "developer")),
    session: AsyncSession = Depends(get_session),
) -> AdminOverviewResponse:
    reporter_user = aliased(User)
    target_user = aliased(User)

    users = (await session.execute(select(User).order_by(User.created_at.desc()))).scalars().all()
    applications = (
        await session.execute(
            select(ExpertApplication, User)
            .join(User, User.id == ExpertApplication.user_id)
            .order_by(ExpertApplication.created_at.desc())
        )
    ).all()
    report_rows = (
        await session.execute(
            select(UserReport, reporter_user, target_user)
            .join(reporter_user, reporter_user.id == UserReport.reporter_user_id)
            .join(target_user, target_user.id == UserReport.target_user_id)
            .order_by(UserReport.created_at.desc())
        )
    ).all()

    return AdminOverviewResponse(
        users=[_serialize_user(user) for user in users],
        expert_applications=[_serialize_application(application, user) for application, user in applications],
        reports=[_serialize_report(report, reporter, target) for report, reporter, target in report_rows],
    )


@router.post("/expert-applications/{application_id}/approve", response_model=ExpertApplicationResponse)
async def approve_expert_application(
    application_id: str,
    payload: ExpertApplicationDecisionRequest,
    current_user: User = Depends(require_roles("admin", "developer")),
    session: AsyncSession = Depends(get_session),
) -> ExpertApplicationResponse:
    result = await session.execute(
        select(ExpertApplication, User)
        .join(User, User.id == ExpertApplication.user_id)
        .where(ExpertApplication.id == application_id)
    )
    row = result.first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expert application not found")

    application, user = row
    application.status = "approved"
    application.review_notes = payload.review_notes
    application.reviewed_at = datetime.utcnow()
    application.reviewed_by_user_id = current_user.id
    user.role = "expert"
    user.expert_application_status = "approved"
    user.can_create_posts = True

    await create_notification(
        session=session,
        user_id=user.id,
        actor_user_id=current_user.id,
        post_id=None,
        comment_id=None,
        kind="expert_approved",
        message="Congratulations! Your expert application has been approved. You are now an expert on Plantify.",
    )

    await session.commit()
    await session.refresh(application)
    await session.refresh(user)
    return _serialize_application(application, user)


@router.post("/expert-applications/{application_id}/reject", response_model=ExpertApplicationResponse)
async def reject_expert_application(
    application_id: str,
    payload: ExpertApplicationDecisionRequest,
    current_user: User = Depends(require_roles("admin", "developer")),
    session: AsyncSession = Depends(get_session),
) -> ExpertApplicationResponse:
    result = await session.execute(
        select(ExpertApplication, User)
        .join(User, User.id == ExpertApplication.user_id)
        .where(ExpertApplication.id == application_id)
    )
    row = result.first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expert application not found")

    application, user = row
    application.status = "rejected"
    application.review_notes = payload.review_notes
    application.reviewed_at = datetime.utcnow()
    application.reviewed_by_user_id = current_user.id
    user.role = "farmer"
    user.expert_application_status = "rejected"
    user.can_create_posts = False

    notes_suffix = f" Notes: {payload.review_notes.strip()}" if payload.review_notes and payload.review_notes.strip() else ""
    await create_notification(
        session=session,
        user_id=user.id,
        actor_user_id=current_user.id,
        post_id=None,
        comment_id=None,
        kind="expert_rejected",
        message=f"Your expert application was not approved at this time.{notes_suffix}",
    )

    await session.commit()
    await session.refresh(application)
    await session.refresh(user)
    return _serialize_application(application, user)


@router.post("/users/{user_id}/ban", response_model=AdminUserSummaryResponse)
async def ban_user(
    user_id: str,
    payload: UserBanRequest,
    current_user: User = Depends(require_roles("admin", "developer")),
    session: AsyncSession = Depends(get_session),
) -> AdminUserSummaryResponse:
    user = await session.scalar(select(User).where(User.id == user_id))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot ban your own account")

    user.is_banned = True
    user.banned_reason = payload.reason.strip() if payload.reason and payload.reason.strip() else None
    user.banned_at = datetime.utcnow()
    await session.commit()
    await session.refresh(user)
    return _serialize_user(user)


@router.post("/users/{user_id}/unban", response_model=AdminUserSummaryResponse)
async def unban_user(
    user_id: str,
    current_user: User = Depends(require_roles("admin", "developer")),
    session: AsyncSession = Depends(get_session),
) -> AdminUserSummaryResponse:
    _ = current_user
    user = await session.scalar(select(User).where(User.id == user_id))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.is_banned = False
    user.banned_reason = None
    user.banned_at = None
    await session.commit()
    await session.refresh(user)
    return _serialize_user(user)


@router.post("/reports/{report_id}/status", response_model=UserReportResponse)
async def update_report_status(
    report_id: str,
    payload: ReportStatusUpdateRequest,
    current_user: User = Depends(require_roles("admin", "developer")),
    session: AsyncSession = Depends(get_session),
) -> UserReportResponse:
    if payload.status not in {"reviewed", "dismissed", "open"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid report status")

    report = await session.scalar(select(UserReport).where(UserReport.id == report_id))
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    reporter = await session.scalar(select(User).where(User.id == report.reporter_user_id))
    target_user = await session.scalar(select(User).where(User.id == report.target_user_id))
    if reporter is None or target_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report users not found")

    report.status = payload.status
    report.reviewed_by_user_id = current_user.id if payload.status != "open" else None
    report.reviewed_at = datetime.utcnow() if payload.status != "open" else None
    await session.commit()
    await session.refresh(report)
    return _serialize_report(report, reporter, target_user)
