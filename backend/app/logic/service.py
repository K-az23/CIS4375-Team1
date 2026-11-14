from decimal import Decimal

from ..extensions import db
from ..models import Service
from .setmore import list_services

MAX_NAME_LENGTH = 100
MAX_DESCRIPTION_LENGTH = 255
MAX_SETMORE_ID_LENGTH = 100
MAX_DURATION_MINUTES = 600
MAX_PRICE = Decimal("99999999.99")


def _is_number(value):
    # Python treats True and False as numbers, so exclude them here.
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
    )


def _clean_optional_text(
    data,
    field,
    max_length,
    cleaned,
    errors,
):
    value = data[field]

    if value is None:
        cleaned[field] = None
    elif not isinstance(value, str):
        errors[field] = "Must be text or null"
    elif len(value.strip()) > max_length:
        errors[field] = (
            f"Must be {max_length} characters or fewer"
        )
    else:
        # Empty text clears the field.
        cleaned[field] = value.strip() or None


# Keep the existing validation for adding and updating services.
def validate_service_data(data, partial=False):
    cleaned = {}
    errors = {}

    if "service_name" in data or not partial:
        name = data.get("service_name")

        if not isinstance(name, str) or not name.strip():
            errors["service_name"] = "Required"
        elif len(name.strip()) > MAX_NAME_LENGTH:
            errors["service_name"] = (
                f"Must be {MAX_NAME_LENGTH} characters or fewer"
            )
        else:
            cleaned["service_name"] = name.strip()

    if "duration_minutes" in data or not partial:
        duration = data.get("duration_minutes")

        if not _is_number(duration) or duration != int(duration):
            errors["duration_minutes"] = "Must be a whole number"
        elif not 1 <= duration <= MAX_DURATION_MINUTES:
            errors["duration_minutes"] = (
                f"Must be between 1 and {MAX_DURATION_MINUTES}"
            )
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
                errors["price"] = (
                    "Can have at most 2 decimal places"
                )
            else:
                cleaned["price"] = amount

    if "description" in data:
        _clean_optional_text(
            data,
            "description",
            MAX_DESCRIPTION_LENGTH,
            cleaned,
            errors,
        )

    if "setmore_service_id" in data:
        _clean_optional_text(
            data,
            "setmore_service_id",
            MAX_SETMORE_ID_LENGTH,
            cleaned,
            errors,
        )

    if "is_active" in data:
        if not partial:
            errors["is_active"] = "New services always start active"
        elif data["is_active"] is not True:
            errors["is_active"] = (
                "Can only be set to true here; "
                "use DELETE to deactivate"
            )
        else:
            cleaned["is_active"] = True

    return cleaned, errors


def service_name_taken(name, exclude_service_id=None):
    query = db.select(Service.service_id).where(
        Service.service_name == name
    )

    if exclude_service_id is not None:
        query = query.where(
            Service.service_id != exclude_service_id
        )

    return db.session.execute(query).first() is not None


def setmore_service_id_taken(
    setmore_id,
    exclude_service_id=None,
):
    query = db.select(Service.service_id).where(
        Service.setmore_service_id == setmore_id
    )

    if exclude_service_id is not None:
        query = query.where(
            Service.service_id != exclude_service_id
        )

    return db.session.execute(query).first() is not None


# Preserve main's standalone service-sync helper.
# It only reads from Setmore. A dry run reports changes without saving them.
def sync_services_from_setmore(dry_run=True):
    result = list_services()
    services = result.get("data", {}).get("services", [])

    summary = {
        "created": [],
        "updated": [],
        "unchanged": [],
    }

    for setmore_service in services:
        setmore_key = setmore_service.get("key")
        service_name = setmore_service.get("service_name")

        if not setmore_key or not service_name:
            continue

        description = setmore_service.get("description")

        if description:
            description = description.strip()[:MAX_DESCRIPTION_LENGTH]

        # Match the real Setmore ID first.
        service = db.session.scalar(
            db.select(Service).where(
                Service.setmore_service_id == setmore_key
            )
        )

        # Older local records may only have a matching name.
        if service is None:
            service = db.session.scalar(
                db.select(Service).where(
                    Service.service_name == service_name
                )
            )

        values = {
            "service_name": service_name,
            "duration_minutes": setmore_service.get("duration"),
            "price": Decimal(str(setmore_service.get("cost", 0))),
            "description": description or None,
            "setmore_service_id": setmore_key,
        }

        if service is None:
            summary["created"].append(service_name)

            if not dry_run:
                db.session.add(
                    Service(**values, is_active=True)
                )

            continue

        changed = any(
            getattr(service, field) != value
            for field, value in values.items()
        )

        if not changed:
            summary["unchanged"].append(service_name)
            continue

        summary["updated"].append(service_name)

        if not dry_run:
            for field, value in values.items():
                setattr(service, field, value)

    if not dry_run:
        db.session.commit()

    return summary