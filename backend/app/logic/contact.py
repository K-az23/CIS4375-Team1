import json
import os
import re

import requests

REQUEST_TIMEOUT_SECONDS = 15

ALLOWED_REASONS = {
    "general_question",
    "hair_replacement_consultation",
    "hair_system_order",
    "appointment_question",
    "membership",
}

MAX_NAME_LENGTH = 100
MAX_EMAIL_LENGTH = 255
MAX_PHONE_LENGTH = 25
MAX_MESSAGE_LENGTH = 500


# Check the submitted fields before sending anything.
def validate_contact_data(data):
    cleaned = {}
    errors = {}

    # Keep the earlier name spellings working too.
    full_name = data.get("full_name")

    if full_name is None:
        full_name = data.get("fullName", data.get("name"))

    email = data.get("email")
    phone = data.get("phone")
    reason = data.get("reason")
    message = data.get("message")

    if not isinstance(full_name, str) or not full_name.strip():
        errors["full_name"] = "Required"
    elif len(full_name.strip()) > MAX_NAME_LENGTH:
        errors["full_name"] = (
            f"Must be {MAX_NAME_LENGTH} characters or less"
        )
    else:
        cleaned["full_name"] = full_name.strip()

    if not isinstance(email, str) or not email.strip():
        errors["email"] = "Required"
    elif len(email.strip()) > MAX_EMAIL_LENGTH:
        errors["email"] = (
            f"Must be {MAX_EMAIL_LENGTH} characters or less"
        )
    elif not re.fullmatch(
        r"[^@\s]+@[^@\s]+\.[^@\s]+",
        email.strip(),
    ):
        errors["email"] = "Must be a valid email address"
    else:
        cleaned["email"] = email.strip().lower()

    if phone is None or phone == "":
        cleaned["phone"] = None
    elif not isinstance(phone, str):
        errors["phone"] = "Must be text"
    elif len(phone.strip()) > MAX_PHONE_LENGTH:
        errors["phone"] = (
            f"Must be {MAX_PHONE_LENGTH} characters or less"
        )
    else:
        cleaned["phone"] = phone.strip() or None

    if not isinstance(reason, str) or not reason.strip():
        errors["reason"] = "Required"
    else:
        reason = reason.strip()

        if reason not in ALLOWED_REASONS:
            errors["reason"] = "Invalid reason"
        else:
            cleaned["reason"] = reason

    if not isinstance(message, str) or not message.strip():
        errors["message"] = "Required"
    elif len(message.strip()) > MAX_MESSAGE_LENGTH:
        errors["message"] = (
            f"Must be {MAX_MESSAGE_LENGTH} characters or less"
        )
    else:
        cleaned["message"] = message.strip()

    return cleaned, errors


# Include a status so the route can distinguish missing settings from send failures.
class ContactError(Exception):
    def __init__(self, message, status=502):
        super().__init__(message)
        self.status = status


# Check the existing AWS service's response before reporting success.
def _check_service_result(result):
    if not isinstance(result, dict):
        raise ContactError(
            "The contact service returned an unexpected response"
        )

    if (
        "success" in result and result["success"] is not True
    ) or result.get("error"):
        raise ContactError(
            "The contact service did not accept the message"
        )

    if result.get("status") in ("error", "failed", "failure"):
        raise ContactError(
            "The contact service did not accept the message"
        )

    # AWS can wrap its result inside a statusCode and body object.
    if "statusCode" in result:
        status = result["statusCode"]

        if type(status) is not int or not 200 <= status < 300:
            raise ContactError(
                "The contact service reported a failed delivery request"
            )

        body = result.get("body")

        if body:
            if isinstance(body, str):
                try:
                    body = json.loads(body)
                except ValueError:
                    raise ContactError(
                        "The contact service returned an unexpected response"
                    ) from None

            if not isinstance(body, dict) or "statusCode" in body:
                raise ContactError(
                    "The contact service returned an unexpected response"
                )

            _check_service_result(body)


# Keep the team's existing AWS connection available.
def _send_contact_with_aws(name, email, message):
    lambda_url = os.getenv("CONTACT_LAMBDA_URL", "").strip()
    api_key = os.getenv("CONTACT_LAMBDA_API_KEY", "").strip()

    if not lambda_url or not api_key:
        raise ContactError(
            "Contact delivery settings are missing",
            status=503,
        )

    headers = {
        "x-api-key": api_key,
        "Content-Type": "application/json",
    }

    payload = {
        "type": "contact_form",
        "data": {
            "name": name,
            "email": email,
            "message": message,
        },
    }

    try:
        response = requests.post(
            lambda_url,
            headers=headers,
            json=payload,
            timeout=REQUEST_TIMEOUT_SECONDS,
            allow_redirects=False,
        )
    except requests.RequestException:
        raise ContactError(
            "Could not reach the contact service"
        ) from None

    if not 200 <= response.status_code < 300:
        raise ContactError(
            f"Contact service failed: HTTP {response.status_code}"
        )

    if response.content.strip():
        try:
            result = response.json()
        except ValueError:
            raise ContactError(
                "The contact service returned an unexpected response"
            ) from None

        _check_service_result(result)

    return True


# Choose the delivery method from settings.
def send_contact_notification(name, email, message):
    method = os.getenv(
        "CONTACT_DELIVERY_METHOD",
        "aws",
    ).strip().lower()

    if method == "aws":
        return _send_contact_with_aws(name, email, message)

    if method != "smtp":
        raise ContactError(
            "Unknown contact delivery method",
            status=503,
        )

    # Contact messages go to the configured inbox.
    # If no separate inbox is set, use the sender's own inbox.
    sender = os.getenv("EMAIL_FROM", "").strip()

    recipient = (
        os.getenv("CONTACT_TO_EMAIL", "").strip()
        or sender
    )

    password = os.getenv("EMAIL_APP_PASSWORD", "").strip()

    if not sender or not password or not recipient:
        raise ContactError(
            "Contact email settings are missing",
            status=503,
        )

    if not re.fullmatch(
        r"[^@\s]+@[^@\s]+\.[^@\s]+",
        recipient,
    ):
        raise ContactError(
            "The contact inbox address is invalid",
            status=503,
        )

    try:
        port = int(os.getenv("EMAIL_PORT", "587"))

        if not 1 <= port <= 65535:
            raise ValueError
    except ValueError:
        raise ContactError(
            "The email port setting is invalid",
            status=503,
        ) from None

    # Reuse the email helper already used by password reset.
    from .email_notif import EmailError, send_email

    body = (
        "Contact form submission\n\n"
        f"Name: {name}\n"
        f"Email: {email}\n"
        f"{message}"
    )

    try:
        send_email(
            to_email=recipient,
            subject="Executive Parlor contact form",
            body=body,
        )
    except EmailError:
        raise ContactError(
            "The email service could not accept the contact message"
        ) from None

    return True