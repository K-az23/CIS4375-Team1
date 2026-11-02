import stripe
from flask import current_app

from ..extensions import db
from ..models import User


class PaymentError(Exception):
    """Raised when Stripe can't complete a request; the message is safe to show users."""


def _client():
    secret_key = current_app.config.get("STRIPE_SECRET_KEY")
    if not secret_key:
        raise PaymentError("Payments are not configured")
    return stripe.StripeClient(secret_key)


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


def _save_card(customer_id, payment_method_id):
    user = db.session.execute(
        db.select(User).where(User.stripe_customer_id == customer_id)
    ).scalar_one_or_none()
    if user is None:
        return

    user.stripe_payment_method_id = payment_method_id
    db.session.commit()