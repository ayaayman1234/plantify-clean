from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr

UserRole = Literal["farmer", "expert", "admin", "developer"]
ExpertApplicationStatus = Literal["none", "pending", "approved", "rejected"]


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: UserRole
    can_create_posts: bool
    expert_application_status: ExpertApplicationStatus
    is_banned: bool = False
    banned_reason: str | None = None
    avatar_b64: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserRoleUpdateRequest(BaseModel):
    role: UserRole


class RoleCodeUpdateRequest(BaseModel):
    code: str
    role: UserRole


class UserProfilePostResponse(BaseModel):
    id: str
    created_at: datetime
    post_text: str
    ai_plant_name: str
    ai_disease: str
    ai_confidence_score: float
    image_b64: str | None = None
    likes_count: int
    comments_count: int


class ExpertProfileResponse(BaseModel):
    headline: str
    phone_number: str
    about: str
    credentials: str
    years_experience: int
    status: ExpertApplicationStatus


class UserProfileDetailResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: UserRole
    can_create_posts: bool
    expert_application_status: ExpertApplicationStatus
    is_banned: bool = False
    banned_reason: str | None = None
    avatar_b64: str | None = None
    created_at: datetime
    posts_count: int
    expert_profile: ExpertProfileResponse | None = None
    posts: list[UserProfilePostResponse]


class PublicUserProfileDetailResponse(BaseModel):
    id: str
    full_name: str
    role: UserRole
    is_banned: bool = False
    avatar_b64: str | None = None
    created_at: datetime
    posts_count: int
    expert_profile: ExpertProfileResponse | None = None
    posts: list[UserProfilePostResponse]


class UserPostingPermissionUpdateRequest(BaseModel):
    can_create_posts: bool
