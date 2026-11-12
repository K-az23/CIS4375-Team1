from datetime import datetime

from app import create_app
from app.extensions import db
from app.models.appointments import Appointment
from app.models.service import Service

app = create_app()


with app.app_context():
    service = db.session.scalar(
        db.select(Service).where(
            Service.service_name == "Mens Haircut"
        )
    )

    if service is None:
        raise RuntimeError("Test service was not found")

    test_appointments = [
        {
            "setmore_booking_id": "local-test-no-show-001",
            "service_id": service.service_id,
            "user_id": None,
            "appointment_time": datetime(2026, 11, 11, 12, 0),
            "status": "booked",
        },
        {
            "setmore_booking_id": "local-test-complete-001",
            "service_id": service.service_id,
            "user_id": None,
            "appointment_time": datetime(2026, 11, 11, 13, 0),
            "status": "booked",
        },
    ]

    for values in test_appointments:
        existing = db.session.get(
            Appointment,
            values["setmore_booking_id"],
        )

        if existing is not None:
            print(
                f"Skipping existing test appointment: "
                f"{values['setmore_booking_id']}"
            )
            continue

        db.session.add(
            Appointment(**values)
        )

        print(
            f"Created test appointment: "
            f"{values['setmore_booking_id']}"
        )

    db.session.commit()

    print("Test appointment setup complete.")