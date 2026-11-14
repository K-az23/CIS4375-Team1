from ..extensions import db
from ..models import Role, User
from ..models.appointments import Appointment
from ..utils.phone import normalize_phone

MAX_FIRST_NAME_LENGTH = 100
MAX_LAST_NAME_LENGTH = 100
MAX_EMAIL_LENGTH = 150


def _normalize_email(value):
    return value.strip().lower()


def _normalize_phone(value):
    # Use the team's shared cleaner for formatted US phone numbers.
    if not isinstance(value, str):
        return None

    phone = normalize_phone(value)

    if phone and phone.startswith("+1") and len(phone) == 12:
        return phone

    return None


# Check whether an email belongs to another account.
def email_taken(email, exclude_user_id=None):
    query = db.select(User.user_id).where(User.email == email)

    if exclude_user_id is not None:
        query = query.where(User.user_id != exclude_user_id)

    return db.session.execute(query).first() is not None


# Validate the contact details a customer can update.
def validate_user_update_data(data, user_id):
    cleaned = {}
    errors = {}

    if "first_name" in data:
        first_name = data["first_name"]

        if not isinstance(first_name, str) or not first_name.strip():
            errors["first_name"] = "Required"
        elif len(first_name.strip()) > MAX_FIRST_NAME_LENGTH:
            errors["first_name"] = (
                f"Must be {MAX_FIRST_NAME_LENGTH} characters or fewer"
            )
        else:
            cleaned["first_name"] = first_name.strip()

    if "last_name" in data:
        last_name = data["last_name"]

        if not isinstance(last_name, str) or not last_name.strip():
            errors["last_name"] = "Required"
        elif len(last_name.strip()) > MAX_LAST_NAME_LENGTH:
            errors["last_name"] = (
                f"Must be {MAX_LAST_NAME_LENGTH} characters or fewer"
            )
        else:
            cleaned["last_name"] = last_name.strip()

    if "email" in data:
        email = data["email"]

        if not isinstance(email, str) or not email.strip():
            errors["email"] = "Required"
        else:
            email = _normalize_email(email)

            if len(email) > MAX_EMAIL_LENGTH:
                errors["email"] = (
                    f"Must be {MAX_EMAIL_LENGTH} characters or fewer"
                )
            elif (
                email.count("@") != 1
                or email.startswith("@")
                or email.endswith("@")
                or "." not in email.split("@", 1)[1]
            ):
                errors["email"] = "Must be a valid email address"
            elif email_taken(email, exclude_user_id=user_id):
                errors["email"] = (
                    "An account with this email already exists"
                )
            else:
                cleaned["email"] = email

    if "phone" in data:
        phone = _normalize_phone(data["phone"])

        if phone is None:
            errors["phone"] = "Must contain 10 digits"
        else:
            cleaned["phone"] = phone

    return cleaned, errors


# Keep the existing rules for account fields managed by an admin.
def validate_admin_user_update_data(data):
    cleaned = {}
    errors = {}

    if "is_active" in data:
        if not isinstance(data["is_active"], bool):
            errors["is_active"] = "Must be true or false"
        else:
            cleaned["is_active"] = data["is_active"]

    if "is_member" in data:
        if not isinstance(data["is_member"], bool):
            errors["is_member"] = "Must be true or false"
        else:
            cleaned["is_member"] = data["is_member"]

    return cleaned, errors


# Preserve main's customer-list lookup.
# Last visit means the customer's most recent completed appointment.
def get_admin_customers():
    last_visit = (
        db.select(
            db.func.max(Appointment.appointment_time)
        )
        .where(
            Appointment.user_id == User.user_id,
            Appointment.status == "completed",
        )
        .correlate(User)
        .scalar_subquery()
    )

    query = (
        db.select(
            User,
            last_visit.label("last_visit"),
        )
        .join(User.role)
        .where(Role.name == "customer")
        .order_by(
            User.last_name,
            User.first_name,
        )
    )

    return db.session.execute(query).all()