from ..extensions import db
from ..models import Role, User
from ..utils.phone import normalize_phone

MAX_FIRST_NAME_LENGTH = 100
MAX_LAST_NAME_LENGTH = 100
MAX_EMAIL_LENGTH = 150
MIN_PASSWORD_LENGTH = 8

# Bcrypt accepts passwords up to 72 bytes.
MAX_PASSWORD_LENGTH = 72


# Check required text before saving it.
def _clean_required_text(data, field, max_length, cleaned, errors):
    value = data.get(field)

    if not isinstance(value, str) or not value.strip():
        errors[field] = "Required"
    elif len(value.strip()) > max_length:
        errors[field] = f"Must be {max_length} characters or fewer"
    else:
        cleaned[field] = value.strip()


def _normalize_email(value):
    # Treat differently capitalized versions as the same email address.
    return value.strip().lower()


def _normalize_phone(value):
    # Use the team's phone cleaner, including spaces and parentheses.
    # Store a US number with +1 followed by its 10 digits.
    if not isinstance(value, str):
        return None

    phone = normalize_phone(value)

    if phone and phone.startswith("+1") and len(phone) == 12:
        return phone

    return None


# Check all the information needed to create a customer account.
def validate_registration_data(data):
    cleaned = {}
    errors = {}

    # Accept either naming style used by the frontend.
    data = {
        **data,
        "first_name": data.get("first_name") or data.get("firstName"),
        "last_name": data.get("last_name") or data.get("lastName"),
    }

    _clean_required_text(
        data,
        "first_name",
        MAX_FIRST_NAME_LENGTH,
        cleaned,
        errors,
    )

    _clean_required_text(
        data,
        "last_name",
        MAX_LAST_NAME_LENGTH,
        cleaned,
        errors,
    )

    email = data.get("email")

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

        else:
            cleaned["email"] = email

    phone = data.get("phone")

    if not isinstance(phone, str) or not phone.strip():
        errors["phone"] = "Required"
    else:
        normalized_phone = _normalize_phone(phone)

        if normalized_phone is None:
            errors["phone"] = "Must contain exactly 10 digits"
        else:
            cleaned["phone"] = normalized_phone

    password = data.get("password")

    if not isinstance(password, str) or not password:
        errors["password"] = "Required"

    elif len(password) < MIN_PASSWORD_LENGTH:
        errors["password"] = (
            f"Password must be at least {MIN_PASSWORD_LENGTH} characters."
        )

    elif len(password.encode("utf-8")) > MAX_PASSWORD_LENGTH:
        errors["password"] = (
            f"Password must be {MAX_PASSWORD_LENGTH} bytes or fewer."
        )

    else:
        # The route hashes this password before putting it in the database.
        cleaned["password"] = password

    return cleaned, errors


# Check whether an email belongs to another account.
def email_taken(email, exclude_user_id=None):
    query = db.select(User.user_id).where(User.email == email)

    if exclude_user_id is not None:
        query = query.where(User.user_id != exclude_user_id)

    return db.session.execute(query).first() is not None


def get_customer_role():
    # New accounts always receive the customer role.
    query = db.select(Role).where(Role.name == "customer")

    return db.session.execute(query).scalar_one_or_none()


# Check the fields sent by the login form.
def validate_login_data(data):
    cleaned = {}
    errors = {}

    email = data.get("email")

    if not isinstance(email, str) or not email.strip():
        errors["email"] = "Required"
    else:
        cleaned["email"] = _normalize_email(email)

    password = data.get("password")

    if not isinstance(password, str) or not password:
        errors["password"] = "Required"
    else:
        cleaned["password"] = password

    return cleaned, errors


def get_user_by_email(email):
    query = db.select(User).where(User.email == email)

    return db.session.execute(query).scalar_one_or_none()


# Check the address submitted to the forgot-password form.
def validate_forgot_password_data(data):
    cleaned = {}
    errors = {}

    email = data.get("email")

    if not isinstance(email, str) or not email.strip():
        errors["email"] = "Required"
    else:
        cleaned["email"] = _normalize_email(email)

    return cleaned, errors


# Check the reset link and new password submitted by the reset form.
def validate_reset_password_data(data):
    cleaned = {}
    errors = {}

    token = data.get("token")

    if not isinstance(token, str) or not token.strip():
        errors["token"] = "Required"
    else:
        cleaned["token"] = token.strip()

    password = data.get("password")

    if not isinstance(password, str) or not password:
        errors["password"] = "Required"
    elif len(password) < MIN_PASSWORD_LENGTH:
        errors["password"] = (
            f"Password must be at least {MIN_PASSWORD_LENGTH} characters."
        )
    elif len(password.encode("utf-8")) > MAX_PASSWORD_LENGTH:
        errors["password"] = (
            f"Password must be {MAX_PASSWORD_LENGTH} bytes or fewer."
        )
    else:
        cleaned["password"] = password

    return cleaned, errors


# Check a signed-in user's current and new passwords before saving.
def validate_change_password_data(data):
    cleaned = {}
    errors = {}

    current_password = data.get("current_password")

    if not isinstance(current_password, str) or not current_password:
        errors["current_password"] = "Required"
    else:
        cleaned["current_password"] = current_password

    new_password = data.get("new_password")

    if not isinstance(new_password, str) or not new_password:
        errors["new_password"] = "Required"
    elif len(new_password) < MIN_PASSWORD_LENGTH:
        errors["new_password"] = (
            f"Must be at least {MIN_PASSWORD_LENGTH} characters"
        )
    elif len(new_password.encode("utf-8")) > MAX_PASSWORD_LENGTH:
        errors["new_password"] = (
            f"Must be {MAX_PASSWORD_LENGTH} bytes or fewer"
        )
    elif new_password == current_password:
        errors["new_password"] = (
            "Must be different from the current password"
        )
    else:
        cleaned["new_password"] = new_password

    return cleaned, errors