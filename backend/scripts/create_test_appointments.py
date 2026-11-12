from datetime import datetime

from app import create_app
from app.extensions import db
from app.models.appointments import Appointment
from app.models.service import Service
from app.models.user import User

app = create_app()


def get_next_test_number():
    """Find the next unused number for local test appointments."""
    number = 1

    while True:
        no_show_id = f"local-test-no-show-{number:03d}"
        complete_id = f"local-test-complete-{number:03d}"

        no_show_exists = db.session.get(Appointment, no_show_id)
        complete_exists = db.session.get(Appointment, complete_id)

        if no_show_exists is None and complete_exists is None:
            return number

        number += 1


with app.app_context():
    service = db.session.scalar(
        db.select(Service).where(
            Service.service_name == "Mens Haircut"
        )
    )

    if service is None:
        raise RuntimeError("Test service was not found")

    test_user = db.session.scalar(
        db.select(User).where(
            User.email == "stripe-no-show-test@example.com"
        )
    )

    if test_user is None:
        raise RuntimeError("Test user was not found")

    test_number = get_next_test_number()

    test_appointments = [
        {
            "setmore_booking_id": (
                f"local-test-no-show-{test_number:03d}"
            ),
            "service_id": service.service_id,
            "user_id": test_user.user_id,
            "appointment_time": datetime(2026, 11, 11, 18, 0),
            "status": "booked",
        },
        {
            "setmore_booking_id": (
                f"local-test-complete-{test_number:03d}"
            ),
            "service_id": service.service_id,
            "user_id": test_user.user_id,
            "appointment_time": datetime(2026, 11, 11, 19, 0),
            "status": "booked",
        },
    ]

    for values in test_appointments:
        db.session.add(
            Appointment(**values)
        )

        print(
            f"Created test appointment: "
            f"{values['setmore_booking_id']}"
        )

    db.session.commit()

    print(
        f"Test appointment setup complete. "
        f"Using test number {test_number:03d}."
    )