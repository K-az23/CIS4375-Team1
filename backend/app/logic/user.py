from ..extensions import db
from ..models import User

MAX_FIRST_NAME_LENGTH = 100
MAX_LAST_NAME_LENGTH = 100
MAX_EMAIL_LENGTH = 150
PHONE_DIGITS = 10



# normalizes emails before being stored in db
def _normalize_email(value):
    return value.strip().lower()


# converts the 10-digit input to a +1 format ~ should help with SMS
def _normalize_phone(value):
    if not isinstance(value, str):
        return None

    value = value.strip()
    if len(value) != PHONE_DIGITS or not value.isdigit():
        return None

    return f"+1{value}"


#check for whether another user already has tried email
def email_taken(email, exclude_user_id=None):
    query = db.select(User.user_id).where(User.email == email)

    if exclude_user_id is not None:
        query = query.where(User.user_id != exclude_user_id)

    return db.session.execute(query).first() is not None


# validates customer profile changes
def validate_user_update_data(data, user_id):
    cleaned = {}
    errors = {}

    if "first_name" in data:
        first_name = data["first_name"]

        if not isinstance(first_name, str) or not first_name.strip():
            errors["first_name"] = "Required"
        elif len(first_name.strip()) > MAX_FIRST_NAME_LENGTH:
            errors["first_name"] = (f"Must be less than {MAX_FIRST_NAME_LENGTH} characters")
        else:
            cleaned["first_name"] = first_name.strip()

    if "last_name" in data:
        last_name = data["last_name"]

        if not isinstance(last_name, str) or not last_name.strip():
            errors["last_name"] = "Required"
        elif len(last_name.strip()) > MAX_FIRST_NAME_LENGTH:
            errors["last_name"] = (f"Must be less than {MAX_LAST_NAME_LENGTH} characters")
        else:
            cleaned["last_name"] = last_name.strip()

    if "email" in data:
        email = data["email"]

        if not isinstance(email, str) or not email.strip():
            errors["email"] = "Required"
        else:
            email= _normalize_email(email)

            if len(email) > MAX_EMAIL_LENGTH:
                errors["email"] = (f"Must be less than {MAX_EMAIL_LENGTH} characters")
            elif (
                email.count("@") != 1
                or email.startswith("@")
                or email.endswith("@")
                or "." not in email.split("@", 1)[1]
            ):
                errors["email"] = "Must be a valid email address"
            elif email_taken(email, exclude_user_id=user_id):
                errors["email"] = "An account with this email already exists"
            else:
                cleaned["email"] = email
    if "phone" in data:
        phone = _normalize_phone(data["phone"])

        if phone is None:
            errors["phone"] = "Must contain 10 digits"
        else:
            cleaned["phone"] = phone

    return cleaned, errors