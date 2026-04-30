import hashlib
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_roles
from app.core.audit import audit_event
from app.core.config import get_settings
from app.db.session import get_session
from app.models.community_comment import CommunityComment
from app.models.community_like import CommunityLike
from app.models.expert_application import ExpertApplication
from app.models.scan_history import ScanHistory
from app.models.user import User
from app.models.user_report import UserReport
from app.schemas.admin import ReportCreateRequest, UserReportResponse
from app.schemas.user import (
    ExpertProfileResponse,
    PublicUserProfileDetailResponse,
    RoleCodeUpdateRequest,
    UserProfileDetailResponse,
    UserProfilePostResponse,
    UserPostingPermissionUpdateRequest,
    UserResponse,
    UserRoleUpdateRequest,
)
from app.services.label_parser import parse_disease_label
from app.services.profile_image_store import load_profile_image_b64, persist_profile_image
from app.services.scan_image_store import load_scan_image_b64
from app.services.upload_validation import validate_image_upload

router = APIRouter(prefix="/users", tags=["users"])

settings = get_settings()


async def _load_latest_expert_profile(session: AsyncSession, user_id: str) -> ExpertProfileResponse | None:
    expert_application = await session.scalar(
        select(ExpertApplication)
        .where(ExpertApplication.user_id == user_id)
        .order_by(ExpertApplication.created_at.desc())
        .limit(1)
    )
    if expert_application is None:
        return None

    return ExpertProfileResponse(
        headline=expert_application.headline,
        phone_number=expert_application.phone_number,
        about=expert_application.about,
        credentials=expert_application.credentials,
        years_experience=expert_application.years_experience,
        status=expert_application.status,
    )


def _serialize_user_report(report: UserReport, reporter: User, target_user: User) -> UserReportResponse:
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


def _clean_profile_text(value: str | None, *, field_name: str, min_length: int, max_length: int) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    if len(cleaned) < min_length:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name} must be at least {min_length} characters long",
        )
    if len(cleaned) > max_length:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name} must be at most {max_length} characters long",
        )
    return cleaned


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        can_create_posts=current_user.can_create_posts,
        expert_application_status=current_user.expert_application_status,
        is_banned=current_user.is_banned,
        banned_reason=current_user.banned_reason,
        avatar_b64=load_profile_image_b64(current_user.avatar_sha256),
        created_at=current_user.created_at,
    )


@router.get("/me/profile", response_model=UserProfileDetailResponse)
async def my_profile(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> UserProfileDetailResponse:
    expert_profile = await _load_latest_expert_profile(session, current_user.id)
    likes_subquery = (
        select(CommunityLike.scan_id.label("scan_id"), func.count(CommunityLike.id).label("likes_count"))
        .group_by(CommunityLike.scan_id)
        .subquery()
    )
    comments_subquery = (
        select(CommunityComment.scan_id.label("scan_id"), func.count(CommunityComment.id).label("comments_count"))
        .group_by(CommunityComment.scan_id)
        .subquery()
    )
    posts_stmt = (
        select(
            ScanHistory,
            func.coalesce(likes_subquery.c.likes_count, 0).label("likes_count"),
            func.coalesce(comments_subquery.c.comments_count, 0).label("comments_count"),
        )
        .outerjoin(likes_subquery, likes_subquery.c.scan_id == ScanHistory.id)
        .outerjoin(comments_subquery, comments_subquery.c.scan_id == ScanHistory.id)
        .where(ScanHistory.user_id == current_user.id, ScanHistory.entry_kind == "community")
        .order_by(ScanHistory.created_at.desc())
    )
    post_rows = (await session.execute(posts_stmt)).all()

    posts = []
    for scan, likes_count, comments_count in post_rows:
        ai_plant_name, ai_disease = parse_disease_label(scan.disease_type)
        posts.append(
            UserProfilePostResponse(
                id=scan.id,
                created_at=scan.created_at,
                post_text=scan.recommendation,
                ai_plant_name=ai_plant_name,
                ai_disease=ai_disease,
                ai_confidence_score=float(scan.confidence_score),
                image_b64=load_scan_image_b64(scan.image_sha256),
                likes_count=int(likes_count or 0),
                comments_count=int(comments_count or 0),
            )
        )

    return UserProfileDetailResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        can_create_posts=current_user.can_create_posts,
        expert_application_status=current_user.expert_application_status,
        is_banned=current_user.is_banned,
        banned_reason=current_user.banned_reason,
        avatar_b64=load_profile_image_b64(current_user.avatar_sha256),
        created_at=current_user.created_at,
        posts_count=len(posts),
        expert_profile=expert_profile,
        posts=posts,
    )


@router.get("/{user_id}/profile", response_model=PublicUserProfileDetailResponse)
async def public_profile(
    user_id: str,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_user),
) -> PublicUserProfileDetailResponse:
    user = await session.scalar(select(User).where(User.id == user_id))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    expert_profile = await _load_latest_expert_profile(session, user.id)
    if expert_profile is not None and expert_profile.status != "approved":
        expert_profile = None

    likes_subquery = (
        select(CommunityLike.scan_id.label("scan_id"), func.count(CommunityLike.id).label("likes_count"))
        .group_by(CommunityLike.scan_id)
        .subquery()
    )
    comments_subquery = (
        select(CommunityComment.scan_id.label("scan_id"), func.count(CommunityComment.id).label("comments_count"))
        .group_by(CommunityComment.scan_id)
        .subquery()
    )
    posts_stmt = (
        select(
            ScanHistory,
            func.coalesce(likes_subquery.c.likes_count, 0).label("likes_count"),
            func.coalesce(comments_subquery.c.comments_count, 0).label("comments_count"),
        )
        .outerjoin(likes_subquery, likes_subquery.c.scan_id == ScanHistory.id)
        .outerjoin(comments_subquery, comments_subquery.c.scan_id == ScanHistory.id)
        .where(ScanHistory.user_id == user.id, ScanHistory.entry_kind == "community")
        .order_by(ScanHistory.created_at.desc())
    )
    post_rows = (await session.execute(posts_stmt)).all()

    posts = []
    for scan, likes_count, comments_count in post_rows:
        ai_plant_name, ai_disease = parse_disease_label(scan.disease_type)
        posts.append(
            UserProfilePostResponse(
                id=scan.id,
                created_at=scan.created_at,
                post_text=scan.recommendation,
                ai_plant_name=ai_plant_name,
                ai_disease=ai_disease,
                ai_confidence_score=float(scan.confidence_score),
                image_b64=load_scan_image_b64(scan.image_sha256),
                likes_count=int(likes_count or 0),
                comments_count=int(comments_count or 0),
            )
        )

    return PublicUserProfileDetailResponse(
        id=user.id,
        full_name=user.full_name,
        role=user.role,
        is_banned=user.is_banned,
        avatar_b64=load_profile_image_b64(user.avatar_sha256),
        created_at=user.created_at,
        posts_count=len(posts),
        expert_profile=expert_profile,
        posts=posts,
    )


@router.post("/{user_id}/report", response_model=UserReportResponse, status_code=status.HTTP_201_CREATED)
async def report_profile(
    user_id: str,
    payload: ReportCreateRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> UserReportResponse:
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot report your own profile")

    reason = payload.reason.strip()
    if len(reason) < 5:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Report reason must be at least 5 characters long")

    target_user = await session.scalar(select(User).where(User.id == user_id))
    if target_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    report = UserReport(
        reporter_user_id=current_user.id,
        target_user_id=target_user.id,
        post_id=None,
        report_type="profile",
        reason=reason,
        status="open",
    )
    session.add(report)
    await session.commit()
    await session.refresh(report)
    return _serialize_user_report(report, current_user, target_user)


@router.patch("/me/profile", response_model=UserResponse)
async def update_my_profile(
    full_name: Annotated[str | None, Form()] = None,
    role: Annotated[str | None, Form()] = None,
    headline: Annotated[str | None, Form()] = None,
    phone_number: Annotated[str | None, Form()] = None,
    about: Annotated[str | None, Form()] = None,
    credentials: Annotated[str | None, Form()] = None,
    years_experience: Annotated[int | None, Form()] = None,
    avatar: UploadFile | None = File(default=None),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    if full_name is not None and full_name.strip():
        current_user.full_name = full_name.strip()

    if role is not None:
        normalized_role = role.strip().lower()
        if normalized_role not in {"farmer", "expert"}:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role must be farmer or expert")
        if normalized_role != current_user.role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Role changes require admin approval and cannot be updated from profile settings.",
            )

    if avatar is not None:
        avatar_bytes = await avatar.read()
        validate_image_upload(avatar, avatar_bytes, field_name="avatar")
        digest = hashlib.sha256(avatar_bytes).hexdigest()
        persist_profile_image(image_sha256=digest, image_bytes=avatar_bytes)
        current_user.avatar_sha256 = digest

    latest_application = await session.scalar(
        select(ExpertApplication)
        .where(ExpertApplication.user_id == current_user.id)
        .order_by(ExpertApplication.created_at.desc())
        .limit(1)
    )
    expert_fields_requested = any(
        value is not None for value in (headline, phone_number, about, credentials, years_experience)
    )
    if expert_fields_requested:
        if latest_application is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No expert application is available to update from this profile.",
            )
        cleaned_headline = _clean_profile_text(headline, field_name="Headline", min_length=5, max_length=160)
        cleaned_phone = _clean_profile_text(phone_number, field_name="Phone number", min_length=7, max_length=32)
        cleaned_about = _clean_profile_text(about, field_name="About", min_length=20, max_length=2000)
        cleaned_credentials = _clean_profile_text(credentials, field_name="Credentials", min_length=10, max_length=2000)

        if cleaned_headline is not None:
            latest_application.headline = cleaned_headline
        if cleaned_phone is not None:
            latest_application.phone_number = cleaned_phone
        if cleaned_about is not None:
            latest_application.about = cleaned_about
        if cleaned_credentials is not None:
            latest_application.credentials = cleaned_credentials
        if years_experience is not None:
            if years_experience < 0 or years_experience > 80:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Years experience must be between 0 and 80.",
                )
            latest_application.years_experience = years_experience

    await session.commit()
    await session.refresh(current_user)
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        can_create_posts=current_user.can_create_posts,
        expert_application_status=current_user.expert_application_status,
        is_banned=current_user.is_banned,
        banned_reason=current_user.banned_reason,
        avatar_b64=load_profile_image_b64(current_user.avatar_sha256),
        created_at=current_user.created_at,
    )


@router.get("", response_model=list[UserResponse])
async def list_users(
    _: User = Depends(require_roles("admin", "developer")),
    session: AsyncSession = Depends(get_session),
) -> list[UserResponse]:
    result = await session.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return [UserResponse.model_validate(user) for user in users]


@router.patch("/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: str,
    payload: UserRoleUpdateRequest,
    request: Request,
    current_user: User = Depends(require_roles("admin", "developer")),
    session: AsyncSession = Depends(get_session),
) -> UserResponse:
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.role = payload.role
    if payload.role == "admin":
        user.can_create_posts = True
        user.expert_application_status = "approved"
    elif payload.role == "expert":
        user.expert_application_status = "approved"
    elif payload.role == "farmer":
        user.expert_application_status = "none"
    await session.commit()
    await session.refresh(user)
    audit_event(
        event="users.role_update",
        outcome="success",
        request=request,
        user_id=current_user.id,
        target_user_id=user.id,
        target_role=user.role,
    )
    return UserResponse.model_validate(user)


@router.post("/self/role/by-code", response_model=UserResponse)
async def update_own_role_by_code(
    payload: RoleCodeUpdateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> UserResponse:
    if payload.role == "expert":
        audit_event(
            event="users.role_elevation",
            outcome="denied",
            request=request,
            user_id=current_user.id,
            reason="expert_role_requires_admin_review",
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Expert role requires admin review and cannot be granted by code.",
        )

    role_elevation_code = settings.role_elevation_code.strip()
    if not role_elevation_code:
        audit_event(
            event="users.role_elevation",
            outcome="denied",
            request=request,
            user_id=current_user.id,
            reason="role_elevation_disabled",
        )
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Role elevation is disabled")

    if payload.code != role_elevation_code:
        audit_event(
            event="users.role_elevation",
            outcome="denied",
            request=request,
            user_id=current_user.id,
            reason="invalid_code",
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid authorization code")

    current_user.role = payload.role
    if payload.role == "expert":
        current_user.expert_application_status = "approved"
        current_user.can_create_posts = True
    elif payload.role == "admin":
        current_user.expert_application_status = "approved"
        current_user.can_create_posts = True
    await session.commit()
    await session.refresh(current_user)
    audit_event(
        event="users.role_elevation",
        outcome="success",
        request=request,
        user_id=current_user.id,
    )
    return UserResponse.model_validate(current_user)


@router.patch("/{user_id}/posting-permission", response_model=UserResponse)
async def update_user_posting_permission(
    user_id: str,
    payload: UserPostingPermissionUpdateRequest,
    current_user: User = Depends(require_roles("admin", "developer")),
    session: AsyncSession = Depends(get_session),
) -> UserResponse:
    _ = current_user
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.can_create_posts = payload.can_create_posts
    await session.commit()
    await session.refresh(user)
    return UserResponse.model_validate(user)
