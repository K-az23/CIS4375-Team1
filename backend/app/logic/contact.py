import os

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



# validation to have a clean contact form fields
def validate_contact_data(data):
    cleaned = {}
    errors = {}

    full_name = data.get("full_name") or data.get("fullName")
    email = data.get("email")
    phone = data.get("phone")
    reason = data.get("reason")
    message = data.get("message")

    if not isinstance(full_name, str) or not full_name.strip():
        errors["full_name"] = "Required"
    elif len(full_name.strip()) > MAX_NAME_LENGTH:
        errors["full_name"] = f"Must be {MAX_NAME_LENGTH} characters or less"
    else:
        cleaned["full_name"] = full_name.strip()

    if not isinstance(email, str) or not email.strip():
        errors["email"] = "Required"
    elif len(email.strip()) > MAX_EMAIL_LENGTH:
        errors["email"] = f"Must be {MAX_EMAIL_LENGTH} characters or less"
    elif(
        email.count("@") != 1
        or email.startswith("@")
        or email.endswith("@")
        or "." not in email.split("@", 1)[1]
    ):
        errors["email"] = "Must be a valid email address"
    else:
        cleaned["email"] = email.strip().lower()

    if phone is None or phone == "":
        cleaned["phone"] = None
    elif not isinstance(phone, str):
        errors["phone"] = "Must be text"
    elif len(phone.strip()) > MAX_PHONE_LENGTH:
        errors["phone"] = f"Must be {MAX_PHONE_LENGTH} characters or less"
    else:
        cleaned["phone"] = phone.strip()

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
        errors["message"] = f"Must be {MAX_MESSAGE_LENGTH} characters or less"
    else:
        cleaned["message"] = message.strip()

    return cleaned, errors


# for if the contact notification cant be sent
class ContactError(Exception):
    pass

def send_contact_notification(name, email, message):
    lambda_url = os.getenv("CONTACT_LAMBDA_URL")
    api_key = os.getenv("CONTACT_LAMBDA_API_KEY")

    if not lambda_url:
        raise ContactError("CONTACT_LAMBDA_URL is not configured")
    if not api_key:
        raise ContactError("CONTACT_LAMBDA_API_KEY is not configured")

    headers = {
        "x-api-key": api_key,
        "Content-Type": "application/json",
    }

    payload = {
        "type": "contact_form",
        "data": {
            "name": name,
            "email": email,
            "message": message
        }
    }

    try:
        response = requests.post(
            lambda_url,
            headers=headers,
            json=payload,
            timeout=REQUEST_TIMEOUT_SECONDS
        )

    except requests.RequestException as exc:
        raise ContactError(f"Could not reach contact service: {type(exc).__name__}") from None

    if not response.ok:
        raise ContactError(f"Contact service failed: HTTP {response.status_code}")

    return True