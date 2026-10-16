from decimal import Decimal
from uuid import uuid4

from ..extensions import db
from ..models import Service

MAX_NAME_LENGTH = 100
MAX_DURATION_MINUTES = 600
MAX_PRICE = Decimal("99999999.99")


def _is_number(value):
    # bool is a subclass of int in Python, so True would otherwise pass as 1.
    return isinstance(value, (int, float)) and not isinstance(value, bool)


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

    return cleaned, errors


def service_name_taken(name, exclude_service_id=None):
    # MySQL's default collation compares text case-insensitively, so this
    # also catches "consultation" vs "Consultation".
    query = db.select(Service.service_id).where(Service.service_name == name)
    if exclude_service_id is not None:
        query = query.where(Service.service_id != exclude_service_id)
    return db.session.execute(query).first() is not None


def new_service_id():
    # Temporary: service_id is text with no auto-increment. Delete this once
    # the database manager changes it to an auto-increment INT.
    return f"svc-{uuid4().hex[:12]}"