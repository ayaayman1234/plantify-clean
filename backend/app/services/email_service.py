import smtplib
from email.message import EmailMessage

from app.core.config import get_settings


def send_password_reset_email(*, to_email: str, full_name: str, code: str) -> None:
    settings = get_settings()
    if not settings.smtp_host.strip() or not settings.smtp_username.strip() or not settings.smtp_password.strip() or not settings.smtp_from_email.strip():
        raise RuntimeError("SMTP email delivery is not configured")

    subject = "Plantify password reset code"
    expires_minutes = settings.password_reset_code_expire_minutes
    greeting_name = full_name.strip() or "there"
    body = (
        f"Hello {greeting_name},\n\n"
        f"Your Plantify password reset code is: {code}\n\n"
        f"This code expires in {expires_minutes} minutes.\n"
        "If you did not request this reset, you can ignore this email.\n"
    )

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
    message["To"] = to_email
    message.set_content(body)

    if settings.smtp_use_ssl:
        with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=20) as server:
            server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(message)
        return

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as server:
        if settings.smtp_use_tls:
            server.starttls()
        server.login(settings.smtp_username, settings.smtp_password)
        server.send_message(message)
