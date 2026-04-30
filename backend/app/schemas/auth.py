from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class ExpertApplicationCreate(BaseModel):
    headline: str = Field(min_length=5, max_length=160)
    phone_number: str = Field(min_length=7, max_length=32)
    about: str = Field(min_length=20, max_length=2000)
    credentials: str = Field(min_length=10, max_length=2000)
    years_experience: int = Field(ge=0, le=80)


class SignUpRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=8, max_length=128)
    account_type: Literal["farmer", "expert"] = "farmer"
    expert_application: ExpertApplicationCreate | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordCodeRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResetRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=4, max_length=12)
    new_password: str = Field(min_length=8, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    refresh_token: str
