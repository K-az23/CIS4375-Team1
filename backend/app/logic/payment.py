from datetime import UTC, datetime
from decimal import Decimal

import stripe
from flask import current_app

from ..extensions import db
from ..models import HairpieceOrder, Payment, User


class PaymentNotAllowed(Exception):
    """Raised when a request can't be paid for; carries the HTTP status to return."""

    def __init__(self, message, status):
        super().__init__(message)
        self.status = status


class PaymentError(Exception):
    """Raised when Stripe can't complete a request; the message is safe to show users."""


def _client():
    secret_key = current_app.config.get("STRIPE_SECRET_KEY")
    if not secret_key:
        raise PaymentError("Payments are not configured")
    return stripe.StripeClient(secret_key)


def _update_payment(payment_intent_id, status):
    payment = db.session.execute(
        db.select(Payment).where(Payment.stripe_payment_intent_id == payment_intent_id)
    ).scalar_one_or_none()
    # Stripe can deliver events out of order; never undo a successful payment.
    if payment is None or payment.status == "succeeded":
        return

    payment.status = status
    if status == "succeeded":
        payment.charged_at = datetime.now(UTC)
    db.session.commit()


def get_or_create_stripe_customer(user):
    """Return the user's Stripe customer id, creating the customer on first use."""
    if user.stripe_customer_id:
        return user.stripe_customer_id

    try:
        customer = _client().v1.customers.create(
            params={
                "email": user.email,
                "name": f"{user.first_name} {user.last_name}",
                "metadata": {"user_id": str(user.user_id)},
            },
            # Retrying a failed request must not create a second Stripe customer.
            options={"idempotency_key": f"customer-for-user-{user.user_id}"},
        )
    except stripe.StripeError:
        raise PaymentError("Unable to reach the payment service") from None

    user.stripe_customer_id = customer.id
    db.session.commit()
    return customer.id


def start_card_setup(user):
    """Create a SetupIntent so the browser can save a card for later charges."""
    customer_id = get_or_create_stripe_customer(user)

    try:
        setup_intent = _client().v1.setup_intents.create(
            params={
                "customer": customer_id,
                # The card is charged later without the customer present
                # (after the appointment or for a no-show).
                "usage": "off_session",
                "automatic_payment_methods": {"enabled": True},
                "metadata": {"user_id": str(user.user_id)},
            }
        )
    except stripe.StripeError:
        raise PaymentError("Unable to start saving the card") from None

    return setup_intent.client_secret


def get_saved_card(user):
    """Return the saved card's display details, or None if there isn't one."""
    if not user.stripe_payment_method_id:
        return None

    try:
        payment_method = _client().v1.payment_methods.retrieve(
            user.stripe_payment_method_id
        )
    except stripe.StripeError:
        raise PaymentError("Unable to load the saved card") from None

    card = payment_method.card
    return {
        "brand": card.brand,
        "last4": card.last4,
        "exp_month": card.exp_month,
        "exp_year": card.exp_year,
    }


def _to_cents(amount):
    # Stripe takes whole cents; Decimal avoids float rounding on money.
    return int((Decimal(amount) * 100).quantize(Decimal(1)))


def start_order_payment(user, order_id):
    """Return a PaymentIntent client_secret for one of the user's hairpiece orders."""
    order = db.session.get(HairpieceOrder, order_id)
    # Someone else's order looks the same as a missing one, so ids can't be probed.
    if order is None or order.user_id != user.user_id:
        raise PaymentNotAllowed("Order not found", 404)
    if order.order_status == "cancelled":
        raise PaymentNotAllowed("This order was cancelled", 409)
    if order.price is None or order.price <= 0:
        raise PaymentNotAllowed("This order has no price yet", 409)

    payment = (
        db.session.execute(
            db.select(Payment)
            .where(Payment.order_id == order.order_id)
            .where(Payment.stripe_payment_intent_id.is_not(None))
            .order_by(Payment.payment_id.desc())
        )
        .scalars()
        .first()
    )

    if payment is not None:
        if payment.status == "succeeded":
            raise PaymentNotAllowed("This order is already paid", 409)
        try:
            intent = _client().v1.payment_intents.retrieve(
                payment.stripe_payment_intent_id
            )
        except stripe.StripeError:
            raise PaymentError("Unable to reach the payment service") from None
        # Reusing the open PaymentIntent means a refresh or retry can't charge twice.
        if intent.status != "canceled":
            return intent.client_secret
        payment.status = "failed"

    customer_id = get_or_create_stripe_customer(user)
    try:
        intent = _client().v1.payment_intents.create(
            params={
                "amount": _to_cents(order.price),
                "currency": "usd",
                "customer": customer_id,
                "automatic_payment_methods": {"enabled": True},
                "description": f"Hairpiece order #{order.order_id}",
                "metadata": {
                    "order_id": str(order.order_id),
                    "user_id": str(user.user_id),
                },
            }
        )
    except stripe.StripeError:
        raise PaymentError("Unable to start the payment") from None

    db.session.add(
        Payment(
            order_id=order.order_id,
            payment_method="card",
            amount=order.price,
            payment_type="hairpiece_order",
            status="pending",
            stripe_payment_intent_id=intent.id,
        )
    )
    db.session.commit()
    return intent.client_secret


def handle_stripe_event(payload, signature):
    """Verify a webhook from Stripe and apply it to the database."""
    secret = current_app.config.get("STRIPE_WEBHOOK_SECRET")
    if not secret:
        raise PaymentError("Webhooks are not configured")

    try:
        event = _client().construct_event(payload, signature, secret)
    except (ValueError, stripe.SignatureVerificationError):
        # Anyone can POST to this URL; only requests signed with our secret count.
        raise PaymentError("Invalid webhook signature") from None

    stripe_object = event.data.object
    if event.type == "setup_intent.succeeded":
        _save_card(stripe_object.customer, stripe_object.payment_method)
    elif event.type == "payment_method.attached":
        _save_card(stripe_object.customer, stripe_object.id)
    elif event.type == "payment_intent.succeeded":
        _update_payment(stripe_object.id, "succeeded")
    elif event.type == "payment_intent.payment_failed":
        _update_payment(stripe_object.id, "failed")


def _save_card(customer_id, payment_method_id):
    user = db.session.execute(
        db.select(User).where(User.stripe_customer_id == customer_id)
    ).scalar_one_or_none()
    if user is None:
        return

    user.stripe_payment_method_id = payment_method_id
    db.session.commit()