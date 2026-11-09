from datetime import datetime
from zoneinfo import ZoneInfo

from ..extensions import db
from ..models.service import Service
from ..models.user import User
from ..utils.phone import normalize_phone

SALON_TIMEZONE = ZoneInfo("America/Chicago")


# normalize for Setmore to user matching
def normalize_email(email):
    if not email:
        return None

    return str(email).strip().lower()


# normalize full names for matching
def normalize_name(first_name, last_name):
    first = " ".join(str(first_name or "").strip().lower().split())
    last = " ".join(str(last_name or "").strip().lower().split())

    return f"{first} {last}".strip()

# normalize setmore country code + phone for matching
def normalize_setmore_phone(customer):
    country_code = str(customer.get("country_code") or "").lstrip("+")

    phone = "".join(
        char
        for char in str(customer.get("cell_phone") or "").lstrip("+")
        if char.isdigit()
    )

    if not phone:
        return None

    if country_code and phone.startswith(country_code):
        return f"+{phone}"

    if country_code:
        return f"+{country_code}{phone}"

    return normalize_phone(phone)

# to convert setmore UTC time to local datetime
def parse_setmore_time(value):
    if not value:
        return None

    parsed = datetime.fromisoformat(str(value))
    local_time = parsed.astimezone(SALON_TIMEZONE)
    return local_time.replace(tzinfo=None)

# matching setmore profile to their website account
# email is preferred, second test will be both phone and full name to match
def find_user_for_setmore_customer(customer):
    email = normalize_email(customer.get("email_id"))

    if email:
        user = db.session.scalar(
            db.select(User).where(User.email == email)
        )

        if user is not None:
            return user

    setmore_phone = normalize_setmore_phone(customer)

    if not setmore_phone:
        return None

    setmore_name = normalize_name(
        customer.get("first_name"),
        customer.get("last_name"),
    )

    if not setmore_name:
        return None

    candidates = db.session.scalars(
        db.select(User).where(User.phone == setmore_phone)
    ).all()

    matches = [
        user
        for user in candidates
        if normalize_name(user.first_name, user.last_name) == setmore_name
    ]

    # avoiding linking automatically if the match is ambiguous
    if len(matches) == 1:
        return matches[0]
    return None


# finding the local service using a Setmore service key
def find_service_for_setmore_booking(booking):
    service_key = booking.get("service_key")

    if not service_key:
        return None

    return db.session.scalar(
        db.select(Service).where(
            Service.setmore_service_id == service_key
        )
    )


# to convert one setmore booking into local appointment data
def build_appointment_data(booking):
    customer = booking.get("customer") or {}
    user = find_user_for_setmore_customer(customer)
    service = find_service_for_setmore_booking(booking)

    if service is None:
        return None

    appointment_time = parse_setmore_time(booking.get("start_time"))

    if appointment_time is None:
        return None

    return {
        "setmore_booking_id": booking.get("key"),
        "user_id": user.user_id if user else None,
        "service_id": service.service_id,
        "appointment_time": appointment_time,
        "status": "booked",
    }