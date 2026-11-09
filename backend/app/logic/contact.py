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