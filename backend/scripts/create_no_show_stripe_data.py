from datetime import datetime

from app import create_app
from app.extensions import db
from app.logic.payment import _client, get_or_create_stripe_customer
from app.models import Appointment, Service, User

TEST_EMAIL = "stripe-no-show-test@example.com"
TEST_BOOKING_ID = "local-test-stripe-no-show-001"
TEST_SERVICE_NAME = "System Service"


app = create_app()


with app.app_context():
    # Safety guard: this script must NEVER run with a live Stripe key.
    secret_key = app.config.get("STRIPE_SECRET_KEY", "")

    if not secret_key.startswith("sk_test_"):
        raise RuntimeError(
            "Refusing to create Stripe test data without a Stripe test key"
        )

    user = db.session.scalar(
        db.select(User).where(User.email == TEST_EMAIL)
    )

    if user is None:
        raise RuntimeError(
            f"Create the test customer {TEST_EMAIL} first"
        )

    service = db.session.scalar(
        db.select(Service).where(
            Service.service_name == TEST_SERVICE_NAME
        )
    )

    if service is None:
        raise RuntimeError(
            f"Hair Replacement service '{TEST_SERVICE_NAME}' was not found"
        )

    customer_id = get_or_create_stripe_customer(user)

    # Only create a Stripe test payment method if this test user
    # does not already have one.
    if not user.stripe_payment_method_id:
        payment_method = _client().v1.payment_methods.create(
            params={
                "type": "card",
                "card": {
                    "token": "tok_visa",
                },
            }
        )

        _client().v1.payment_methods.attach(
            payment_method.id,
            params={
                "customer": customer_id,
            },
        )

        user.stripe_payment_method_id = payment_method.id

    appointment = db.session.get(
        Appointment,
        TEST_BOOKING_ID,
    )

    if appointment is None:
        appointment = Appointment(
            setmore_booking_id=TEST_BOOKING_ID,
            service_id=service.service_id,
            user_id=user.user_id,
            appointment_time=datetime(2026, 11, 11, 15, 0),
            status="booked",
            cancellation_fee_charged=False,
        )

        db.session.add(appointment)

    db.session.commit()

    print("Stripe no-show test data ready.")
    print("Appointment:", TEST_BOOKING_ID)
    print("Service:", service.service_name)
    print("Website user linked:", appointment.user_id is not None)
    print("Stripe customer configured:", bool(user.stripe_customer_id))
    print("Stripe test card configured:", bool(user.stripe_payment_method_id))