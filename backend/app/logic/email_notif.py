import os
import smtplib
import ssl
from email.message import EmailMessage
from urllib.parse import urlencode

from ..extensions import db
from ..models import Role, User


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
        "Link will expire in 15 minutes.\n\n"
        "If you did not request a password reset, "
        "you can ignore this email."
    )

    send_email(
        to_email=to_email,
        subject=subject,
        body=body,
    )


# Return email addresses for active admin accounts
def _active_admin_emails():
    return(
        db.session.execute(
            db.select(User.email)
            .join(User.role)
            .where(
                Role.name == "admin",
                User.is_active.is_(True),
            )
        )
        .scalars()
        .all()
    )


# for readable hair-system details - notification emails for admin
def _order_details(order):
    details = [
        f"Order: #{order.order_id}",
        f"System type: {str(order.order_type).replace('_', ' ').title()}",
    ]

    optional_details = (
        ("Hair type", order.hair_type),
        ("Color", order.color_code),
        ("Grey percentage", order.grey_percentage),
        ("Density", order.density),
        ("Skin type", order.skin_type),
        ("Base type", order.base_type),
        ("Dimensions", order.dimensions),
    )

    for label, value in optional_details:
        if value is not None and value != "":
            if label == "Grey percentage":
                value = f"{value}%"

            details.append(f"{label}: {value}")

    return "\n".join(details)


# Send the customer a receipt after their hair-system payment succeeds
def send_order_confirmation_email(customer, order, amount):
    customer_name = f"{customer.first_name} {customer.last_name}".strip()

    subject = (
        f"Payment received for hair-system order #{order.order_id}"
    )

    body = (
        f"Hello {customer_name},\n\n"
        "Thank you for your hair-system order with "
        "The Executive Parlor.\n\n"
        "Your payment has been successfully received.\n\n"
        f"{_order_details(order)}\n"
        f"Amount paid: ${float(amount):.2f}\n\n"
        "Please schedule your appointment at least two weeks out from purchase date, "
        "or wait until we email you that your hair system has "
        "arrived at the salon.\n\n"
        "We will send another email when your hair system arrives."
    )

    send_email(
        to_email=customer.email,
        subject=subject,
        body=body,
    )


# Notify active admins that a paid hair-system order is ready.
def send_admin_paid_order_email(customer, order, amount):
    customer_name = f"{customer.first_name} {customer.last_name}".strip()

    subject = (
        f"Paid hair-system order #{order.order_id} ready for processing"
    )

    body = (
        "A hair-system order has been paid and is ready "
        "for processing.\n\n"
        "Customer:\n"
        f"Name: {customer_name}\n"
        f"Email: {customer.email}\n"
        f"Phone: {customer.phone or 'Not provided'}\n\n"
        "Order details:\n"
        f"{_order_details(order)}\n"
        f"Amount paid: ${float(amount):.2f}\n\n"
        "The order is now pending and can be processed "
        "for vendor ordering."
    )

    admin_emails = _active_admin_emails()

    if not admin_emails:
        raise EmailError("No active admin email is configured")

    delivered = False

    for admin_email in admin_emails:
        try:
            send_email(
                to_email=admin_email,
                subject=subject,
                body=body,
            )
            delivered = True
        except EmailError:
            continue

    if not delivered:
        raise EmailError("Unable to notify an admin")


# Tell the customer that their hair system arrived at the salon
def send_hair_system_arrival_email(customer, order):

    customer_name = f"{customer.first_name} {customer.last_name}".strip()

    subject = (
        f"Your hair system for order #{order.order_id} has arrived"
    )

    body = (
        f"Hello {customer_name},\n\n"
        "Your hair system has arrived at The Executive Parlor.\n\n"
        f"{_order_details(order)}\n\n"
        "If you have not already scheduled your appointment, "
        "you can now book your visit through Setmore.\n\n"
        "We look forward to seeing you!"
    )

    send_email(
        to_email=customer.email,
        subject=subject,
        body=body,
    )


# Notify active admins that inventory crossed its reorder threshold
def send_admin_low_stock_email(item):
    subject = f"Low-stock alert: {item.item_name}"

    body = (
        "An inventory item has reached its reorder level.\n\n"
        f"Item: {item.item_name}\n"
        f"SKU: {item.sku or 'None'}\n"
        f"Quantity remaining: {item.quantity_on_hand}\n"
        f"Reorder level: {item.reorder_threshold}\n"
        f"Unit: {item.unit}\n\n"
        "The item may need to be restocked."
    )

    admin_emails = _active_admin_emails()

    if not admin_emails:
        raise EmailError("No active admin email is configured")

    delivered = False

    for admin_email in admin_emails:
        try:
            send_email(
                to_email=admin_email,
                subject=subject,
                body=body,
            )
            delivered = True
        except EmailError:
            continue

    if not delivered:
        raise EmailError("Unable to notify an admin")