import pytest

from app.api.routes import auth


@pytest.mark.asyncio
async def test_forgot_password_updates_credentials(client):
    signup_response = await client.post(
        "/api/auth/signup",
        json={
            "email": "reset@example.com",
            "full_name": "Reset User",
            "password": "oldpassword123",
        },
    )
    assert signup_response.status_code == 200

    auth.settings.smtp_host = "smtp.gmail.com"
    auth.settings.smtp_port = 587
    auth.settings.smtp_username = "demo@gmail.com"
    auth.settings.smtp_password = "app-password"
    auth.settings.smtp_from_email = "demo@gmail.com"

    sent = {}

    def fake_send_password_reset_email(*, to_email: str, full_name: str, code: str) -> None:
        sent["to_email"] = to_email
        sent["full_name"] = full_name
        sent["code"] = code

    auth.send_password_reset_email = fake_send_password_reset_email

    request_code_response = await client.post(
        "/api/auth/forgot-password/request-code",
        json={
            "email": "reset@example.com",
        },
    )
    assert request_code_response.status_code == 200
    assert request_code_response.json()["status"] == "ok"
    assert sent["to_email"] == "reset@example.com"
    assert len(sent["code"]) == 6

    reset_response = await client.post(
        "/api/auth/forgot-password/reset",
        json={
            "email": "reset@example.com",
            "code": sent["code"],
            "new_password": "newpassword123",
        },
    )
    assert reset_response.status_code == 200
    assert reset_response.json()["status"] == "ok"

    old_login_response = await client.post(
        "/api/auth/login",
        json={"email": "reset@example.com", "password": "oldpassword123"},
    )
    assert old_login_response.status_code == 401

    new_login_response = await client.post(
        "/api/auth/login",
        json={"email": "reset@example.com", "password": "newpassword123"},
    )
    assert new_login_response.status_code == 200
