from decimal import Decimal

from ..extensions import db
from ..models import Service

MAX_NAME_LENGTH = 100
MAX_DESCRIPTION_LENGTH = 255
MAX_SETMORE_ID_LENGTH = 100
MAX_DURATION_MINUTES = 600
MAX_PRICE = Decimal("99999999.99")


def _is_number(value):
    # bool is a subclass of int in Python, so True would otherwise pass as 1.
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def _clean_optional_text(data, field, max_length, cleaned, errors):
    value = data[field]
    if value is None:
        cleaned[field] = None
    elif not isinstance(value, str):
        errors[field] = "Must be text or null"
    elif len(value.strip()) > max_length:
        errors[field] = f"Must be {max_length} characters or fewer"
    else:
        # An empty string clears the field, the same as null.
        cleaned[field] = value.strip() or None


def validate_service_data(data, partial=False):
    """Return (cleaned_fields, errors). partial=True only checks fields that were sent."""
    cleaned = {}
    errors = {}

    if "service_name" in data or not partial:
        name = data.get("service_name")
        if not isinstance(name, str) or not name.strip():
            errors["service_name"] = "Required"
        elif len(name.strip()) > MAX_NAME_LENGTH:
            errors["service_name"] = f"Must be {MAX_NAME_LENGTH} characters or fewer"
        else:
            cleaned["service_name"] = name.strip()

    if "duration_minutes" in data or not partial:
        duration = data.get("duration_minutes")
        if not _is_number(duration) or duration != int(duration):
            errors["duration_minutes"] = "Must be a whole number"
        elif not 1 <= duration <= MAX_DURATION_MINUTES:
            errors["duration_minutes"] = f"Must be between 1 and {MAX_DURATION_MINUTES}"
        else:
            cleaned["duration_minutes"] = int(duration)

    if "price" in data or not partial:
        price = data.get("price")
        if not _is_number(price):
            errors["price"] = "Must be a number"
        else:
            amount = Decimal(str(price))
            if not Decimal(0) <= amount <= MAX_PRICE:
                errors["price"] = "Must be 0 or more"
            elif amount.as_tuple().exponent < -2:
                errors["price"] = "Can have at most 2 decimal places"
            else:
                cleaned["price"] = amount

    if "description" in data:
        _clean_optional_text(data, "description", MAX_DESCRIPTION_LENGTH, cleaned, errors)

    if "setmore_service_id" in data:
        _clean_optional_text(
            data, "setmore_service_id", MAX_SETMORE_ID_LENGTH, cleaned, errors
        )

    if "is_active" in data:
        if not partial:
            errors["is_active"] = "New services always start active"
        elif data["is_active"] is not True:
            errors["is_active"] = "Can only be set to true here; use DELETE to deactivate"
        else:
            cleaned["is_active"] = True

    return cleaned, errors


def service_name_taken(name, exclude_service_id=None):
    # MySQL's default collation compares text case-insensitively, so this
    # also catches "consultation" vs "Consultation".
    query = db.select(Service.service_id).where(Service.service_name == name)
    if exclude_service_id is not None:
        query = query.where(Service.service_id != exclude_service_id)
    return db.session.execute(query).first() is not None


def setmore_service_id_taken(setmore_id, exclude_service_id=None):
    query = db.select(Service.service_id).where(Service.setmore_service_id == setmore_id)
    if exclude_service_id is not None:
        query = query.where(Service.service_id != exclude_service_id)
    return db.session.execute(query).first() is not None