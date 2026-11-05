from datetime import UTC, date, datetime, time, timedelta
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


def _user_payments_query(user):
    # Payments link to a customer through their hairpiece order.
    return (
        db.select(Payment)
        .join(HairpieceOrder, Payment.order_id == HairpieceOrder.order_id)
        .where(HairpieceOrder.user_id == user.user_id)
    )


def list_user_payments(user):
    """Return the user's payments, newest first."""
    query = _user_payments_query(user).order_by(Payment.payment_id.desc())
    return db.session.execute(query).scalars().all()


def get_user_payment(user, payment_id):
    """Return one of the user's payments, or None if it isn't theirs."""
    query = _user_payments_query(user).where(Payment.payment_id == payment_id)
    return db.session.execute(query).scalar_one_or_none()


PAYMENT_STATUSES = ("pending", "succeeded", "failed", "refunded", "cancelled")


def _parse_date(value, field, errors):
    try:
        return date.fromisoformat(value)
    except ValueError:
        errors[field] = "Must be a date like 2026-11-03"
        return None


def validate_payment_filters(args):
    """Return (filters, errors) for the admin payment list's query string."""
    filters = {}
    errors = {}

    status = args.get("status")
    if status:
        if status not in PAYMENT_STATUSES:
            errors["status"] = f"Must be one of: {', '.join(PAYMENT_STATUSES)}"
        else:
            filters["status"] = status

    for field in ("from", "to"):
        if args.get(field):
            parsed = _parse_date(args[field], field, errors)
            if parsed:
                filters[field] = parsed

    if "from" in filters and "to" in filters and filters["from"] > filters["to"]:
        errors["to"] = "Must be on or after from"

    return filters, errors


def list_all_payments(filters):
    """Return every payment matching the filters, newest first, for the admin side."""
    query = db.select(Payment).order_by(Payment.payment_id.desc())

    if "status" in filters:
        query = query.where(Payment.status == filters["status"])
    # Date filters use charged_at, so they only match payments that went through.
    if "from" in filters:
        start = datetime.combine(filters["from"], time.min)
        query = query.where(Payment.charged_at >= start)
    if "to" in filters:
        end = datetime.combine(filters["to"] + timedelta(days=1), time.min)
        query = query.where(Payment.charged_at < end)

    return db.session.execute(query).scalars().all()


def payment_with_customer(payment):
    """Admin view of a payment, including who paid."""
    order = payment.hairpiece_order
    customer = order.user if order else None
    return {
        **payment.to_admin_dict(),
        "customer": {
            "user_id": customer.user_id,
            "first_name": customer.first_name,
            "last_name": customer.last_name,
            "email": customer.email,
        }
        if customer
        else None,
    }


def refund_payment(payment):
    """Fully refund a card payment through Stripe and return the updated payment."""
    if payment.status == "refunded":
        raise PaymentNotAllowed("This payment was already refunded", 409)
    if payment.status != "succeeded":
        raise PaymentNotAllowed("Only successful payments can be refunded", 409)
    if not payment.stripe_payment_intent_id:
        raise PaymentNotAllowed("Only card payments can be refunded here", 409)

    try:
        refund = _client().v1.refunds.create(
            params={"payment_intent": payment.stripe_payment_intent_id},
            # A double-click or retry must not refund twice.
            options={"idempotency_key": f"refund-payment-{payment.payment_id}"},
        )
    except stripe.StripeError:
        raise PaymentError("Unable to refund the payment") from None

    # Card refunds usually succeed at once; otherwise the webhook finishes it.
    if refund.status == "succeeded":
        payment.status = "refunded"
        db.session.commit()
    return payment


def cancel_order_payment(order):
    """Stop any unpaid Stripe payment for an order that is being cancelled.

    Call this from the cancel-order endpoint before marking the order cancelled.
    """
    payments = (
        db.session.execute(
            db.select(Payment)
            .where(Payment.order_id == order.order_id)
            .where(Payment.stripe_payment_intent_id.is_not(None))
        )
        .scalars()
        .all()
    )

    if any(p.status == "succeeded" for p in payments):
        raise PaymentNotAllowed("This order is already paid; refund it first", 409)

    for payment in payments:
        if payment.status not in ("pending", "failed"):
            continue
        try:
            intent = _client().v1.payment_intents.retrieve(
                payment.stripe_payment_intent_id
            )
            if intent.status == "succeeded":
                # Paid in Stripe, but the webhook hasn't reached us yet.
                raise PaymentNotAllowed(
                    "This order was just paid; refund it first", 409
                )
            if intent.status != "canceled":
                _client().v1.payment_intents.cancel(payment.stripe_payment_intent_id)
        except stripe.StripeError:
            raise PaymentError("Unable to cancel the payment") from None
        payment.status = "cancelled"

    db.session.commit()


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
    elif event.type == "payment_intent.canceled":
        _update_payment(stripe_object.id, "cancelled")
    elif event.type == "charge.refunded" and stripe_object.refunded:
        _mark_refunded(stripe_object.payment_intent)


def _save_card(customer_id, payment_method_id):
    user = db.session.execute(
        db.select(User).where(User.stripe_customer_id == customer_id)
    ).scalar_one_or_none()
    if user is None:
        return

    user.stripe_payment_method_id = payment_method_id
    db.session.commit()


def _mark_refunded(payment_intent_id):
    # Also covers refunds Natasha makes in the Stripe dashboard.
    payment = db.session.execute(
        db.select(Payment).where(Payment.stripe_payment_intent_id == payment_intent_id)
    ).scalar_one_or_none()
    if payment is None or payment.status == "refunded":
        return

    payment.status = "refunded"
    db.session.commit()