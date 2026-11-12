from datetime import datetime, time

from ..extensions import db
from ..models.appointments import Appointment
from ..models.service import Service
from ..models.user import User
from ..utils.phone import normalize_phone

# Optional future implementation, for no-show fee
#NO_SHOW_FEE = Decimal("50.00")
#NO_SHOW_FEE_SCOPE = "hair_replacement"
# NO_SHOW_FEE_SCOPE = "all"
#HAIR_REPLACEMENT_SERVICES = {
#    "Hair System Maintenance",
#    "System Service - Members Only",
#    "System Styling",
#    "System Service",
#    "System Service & Color",
#    "New System Application - Members Only",
#    "Cut-In Personal System",
#}


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


# to convert setmore UTC time to local datetime, need to check with setmore 
# and make sure its converting correctly
"""def parse_setmore_time(value):
    if not value:
        return None

    parsed = datetime.fromisoformat(str(value))
    local_time = parsed.astimezone(SALON_TIMEZONE)
    return local_time.replace(tzinfo=None) """
# holder of default setmore time
def parse_setmore_time(value):
    if not value:
        return None

    return datetime.fromisoformat(str(value))

# remove UTC timezone info before storing into DATETIME
def to_db_datetime(value):
    if value is None:
        return None
    return value.replace(tzinfo=None)


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

# maps setmore bookings without writing anything in the db
def preview_setmore_appointments(bookings):
    preview = []

    for booking in bookings:
        customer = booking.get("customer") or {}

        user = find_user_for_setmore_customer(customer)
        service = find_service_for_setmore_booking(booking)
        appointment_time = parse_setmore_time(booking.get("start_time"))

        preview.append(
            {
                "booking_found": bool(booking.get("key")),
                "service_matched": service is not None,
                "service_id": service.service_id if service else None,
                "user_matched": user is not None,
                "user_id": user.user_id if user else None,
                "appointment_time": appointment_time
            }
        )

    return preview


# sync setmore booking into the local appointments table
def sync_setmore_appointments(bookings, dry_run=True):
    summary = {
        "created": [],
        "updated": [],
        "unchanged": [],
        "skipped": [],
    }

    for booking in bookings:
        booking_id = booking.get("key")

        if not booking_id:
            summary["skipped"].append("missing_booking_id")
            continue

        customer = booking.get("customer") or {}
        user = find_user_for_setmore_customer(customer)
        service = find_service_for_setmore_booking(booking)

        if service is None:
            summary["skipped"].append(
                {
                    "booking_id": booking_id,
                    "reason": "service_not_matched",
                    "service_key": booking.get("service_key"),
                }
            )
            continue

        parsed_time = parse_setmore_time(booking.get("start_time"))

        if parsed_time is None:
            summary["skipped"].append("invalid_appointment_time")
            continue

        appointment_time = to_db_datetime(parsed_time)

        customer_name = normalize_name(
            customer.get("first_name"),
            customer.get("last_name"),
        )

        customer_email = normalize_email(
            customer.get("email_id")
        )

        customer_phone = normalize_setmore_phone(
            customer
        )

        appointment = db.session.get(Appointment, booking_id)
        values = {
            "service_id": service.service_id,
            "user_id": user.user_id if user else None,
            "customer_name": customer_name or None,
            "customer_email": customer_email,
            "customer_phone": customer_phone,
            "appointment_time": appointment_time
        }

        if appointment is None:
            summary["created"].append(booking_id)

            if not dry_run:
                db.session.add(
                    Appointment(
                        setmore_booking_id=booking_id,
                        status="booked",
                        **values
                    )
                )

            continue
        changed = any(
            getattr(appointment, field) != value
            for field, value in values.items()
        )

        if not changed:
            summary["unchanged"].append(booking_id)
            continue
        summary["updated"].append(booking_id)

        if not dry_run:
            for field, value in values.items():
                setattr(appointment, field, value)

    if not dry_run:
        db.session.commit()

    return summary

# --- Admin logic

# Returns local appointments for the admin calendar
def get_admin_appointments(start_date=None, end_date=None):
    query = db.select(Appointment).order_by(Appointment.appointment_time)

    if start_date:
        start_datetime = datetime.combine(start_date, time.min)
        query = query.where(
            Appointment.appointment_time >= start_datetime
        )

    if end_date:
        end_datetime = datetime.combine(end_date, time.max)
        query = query.where(
            Appointment.appointment_time <= end_datetime
        )

    return db.session.scalars(query).all()

# returns one local appointment for admin use
def get_admin_appointment(setmore_booking_id):
    return db.session.get(
        Appointment,
        setmore_booking_id
    )


# -- User appointment logic for completed / no-show
# for marking a local appointment as a no-show and updating customer tracking
# the commented out lines are for charging a no-show fee
def mark_appointment_no_show(setmore_booking_id):
    appointment = get_admin_appointment(setmore_booking_id)

    if appointment is None:
        return None, "not_found"

    if appointment.status != "booked":
        return appointment, "already_finalized"

    # Future optional no-show fee logic.
    # Sponsor currently does not charge a no-show fee.
    #
    # fee_charged = False
    #
    # if should_charge_no_show_fee(appointment):
    #     # Prevent a second no-show charge for the same appointment.
    #     if appointment.cancellation_fee_charged:
    #         return appointment, "fee_already_charged"
    #
    #     from .payment import charge_appointment_no_show_fee
    #
    #     _payment, payment_error = charge_appointment_no_show_fee(
    #         appointment,
    #         NO_SHOW_FEE,
    #     )
    #
    #     if payment_error:
    #         db.session.rollback()
    #         return appointment, payment_error
    #
    #     appointment.cancellation_fee_charged = True
    #     fee_charged = True

    appointment.status = "no_show"
    if appointment.user is not None:
        appointment.user.no_show_count = (
            appointment.user.no_show_count or 0
        ) + 1

    db.session.commit()

    return appointment, None

    # Future return if no-show fees are enabled:
    #
    # return appointment, {
    #     "fee_charged": fee_charged,
    #     "fee_amount": float(NO_SHOW_FEE) if fee_charged else 0.0,
    # }

# to mark a local appointment as completed
def complete_appointment(setmore_booking_id):
    appointment = get_admin_appointment(setmore_booking_id)

    if appointment is None:
        return None, "not_found"

    if appointment.status != "booked":
        return appointment, "already_finalized"

    appointment.status = "completed"
    db.session.commit()

    return appointment, None

# No show logic - charge is set only for hair system service
# but made easy to change to all services
# Return whether this appointment should receive the no-show fee
#def should_charge_no_show_fee(appointment):
#    if NO_SHOW_FEE_SCOPE == "all":
#        return True
#
#    if NO_SHOW_FEE_SCOPE == "hair_replacement":
#        return (
#            appointment.service is not None
#            and appointment.service.service_name
#            in HAIR_REPLACEMENT_SERVICES
#        )
#
#    return False



# serializer - convert an appointment model into appropriate API response data
def serialize_appointment(appointment):
    service = appointment.service
    user = appointment.user

    return {
        "setmore_booking_id": appointment.setmore_booking_id,
        "appointment_time": appointment.appointment_time.isoformat(),
        "status": appointment.status,
        "service": {
            "service_id": service.service_id,
            "service_name": service.service_name,
            "duration_minutes": service.duration_minutes,
            "price": float(service.price),
        } if service else None,

        "customer": {
            "user_id": user.user_id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "phone": user.phone,
        } if user else {
            "user_id": None,
            "name": appointment.customer_name,
            "email": appointment.customer_email,
            "phone": appointment.customer_phone,
        },
    }


# --- User Logic

# returns appointments to user
def get_user_appointments(user_id):
    query = (
        db.select(Appointment)
        .where(Appointment.user_id == user_id)
        .order_by(Appointment.appointment_time)
    )

    return db.session.scalars(query).all()

# return an instance of an appointment to a user
def get_user_appointment(user_id, setmore_booking_id):
    return db.session.scalar(
        db.select(Appointment).where(
            Appointment.setmore_booking_id == setmore_booking_id,
            Appointment.user_id == user_id,
        )
    )