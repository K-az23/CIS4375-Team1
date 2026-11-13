import os
import smtplib
import ssl
from email.message import EmailMessage
from urllib.parse import urlencode


class EmailError(Exception):
    """Raised when an application email cannot be sent."""

# Return the SMTP configuration stored in environment variables
def _smtp_settings():
    host = os.getenv("EMAIL_HOST", "smtp.gmail.com")
    port = int(os.getenv("EMAIL_PORT", "587"))
    sender = os.getenv("EMAIL_FROM")
    app_password = os.getenv("EMAIL_APP_PASSWORD")

    if not sender or not app_password:
        raise EmailError("Email service is not configured")

    return host, port, sender, app_password


#Send a plain-text application email through Gmail SMTP
def send_email(to_email, subject, body):
    host, port, sender, app_password = _smtp_settings()

    message = EmailMessage()
    message["From"] = sender
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)

    context = ssl.create_default_context()

    try:
        with smtplib.SMTP(host, port, timeout=15) as smtp:
            smtp.ehlo()
            smtp.starttls(context=context)
            smtp.ehlo()

            smtp.login(
                sender,
                app_password,
            )

            smtp.send_message(message)

    except (smtplib.SMTPException, OSError) as exc:
        raise EmailError(
            "Unable to send email"
        ) from exc


# Send a password-reset link to a customer
def send_password_reset_email(to_email, reset_token):
    client_url = os.getenv(
        "CLIENT_URL",
        "http://localhost:5173",
    ).rstrip("/")

    query = urlencode(
        {
            "token": reset_token,
        }
    )

    reset_url = (
        f"{client_url}/reset-password?{query}"
    )

    subject = "Reset your Executive Parlor password"

    body = (
        "We received a request to reset your password.\n\n"
        "Use the link below to choose a new password:\n\n"
        f"{reset_url}\n\n"
        "If you did not request a password reset, "
        "you can ignore this email."
    )

    send_email(
        to_email=to_email,
        subject=subject,
        body=body,
    )