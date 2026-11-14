from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from hashlib import sha256

from sqlalchemy import and_, or_
from sqlalchemy.exc import IntegrityError

import stripe
from flask import current_app

from ..extensions import db
from ..models import Appointment, HairpieceOrder, Payment, User
from ..utils.salon_time import start_of_day_utc


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
        db.select(Payment).where(Payment.stripe_payment_intent_id == payment_intent_id).with_for_update()
        .execution_options(populate_existing=True)
    ).scalar_one_or_none()
    # Stripe can deliver events out of order; never undo a successful payment.
    if payment is None or payment.status in ("succeeded", "refunded"):
        return
    if payment.status == "cancelled" and status != "succeeded":
        return

    payment.status = status
    if status == "succeeded":
        payment.charged_at = datetime.now(UTC).replace(tzinfo=None)
        order = payment.hairpiece_order
        # Paid: Natasha can now order the system from the vendor.
        if order is not None and order.order_status == "invoice_sent":
            order.order_status = "pending"
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
            options={"idempotency_key": "customer-" + sha256(
                f"{user.user_id}:{user.email}:{user.first_name}:{user.last_name}".encode()
            ).hexdigest()[:32]},
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


def _payable_order(user, order_id):
    # Lock the order while choosing its payment attempt. Other owners see 404.
    order = db.session.execute(
        db.select(HairpieceOrder).where(HairpieceOrder.order_id == order_id)
        .with_for_update().execution_options(populate_existing=True)
    ).scalar_one_or_none()
    if order is None or order.user_id != user.user_id:
        raise PaymentNotAllowed("Order not found", 404)
    if order.order_status != "invoice_sent":
        raise PaymentNotAllowed("This order is not waiting for payment", 409)
    if order.price is None or order.price <= 0:
        raise PaymentNotAllowed("This order has no price yet", 409)
    payments = db.session.execute(
        db.select(Payment).where(Payment.order_id == order_id).order_by(Payment.payment_id.desc())
    ).scalars().all()
    if any(payment.status in ("succeeded", "refunded") for payment in payments):
        raise PaymentNotAllowed("This order has already been paid", 409)
    return order, payments


def _check_intent(intent, order, customer_id):
    # Reusing an intent is safe only while its amount and customer still match.
    amount = getattr(intent, "amount", None)
    currency = getattr(intent, "currency", None)
    customer = getattr(intent, "customer", None)
    secret = getattr(intent, "client_secret", None)
    if (not isinstance(amount, int) or isinstance(amount, bool)
        or not isinstance(currency, str) or not isinstance(customer, str)
        or not isinstance(secret, str) or not secret
        or not isinstance(getattr(intent, "id", None), str)
        or not isinstance(getattr(intent, "status", None), str)):
        raise PaymentError("The payment service returned an incomplete response")
    if amount != _to_cents(order.price) or currency != "usd" or customer != customer_id:
        raise PaymentNotAllowed("The payment details changed. Contact the salon before paying.", 409)


def start_order_payment(user, order_id):
    """Create or reuse one PaymentIntent using the saved invoice amount."""
    _payable_order(user, order_id)
    customer_id = get_or_create_stripe_customer(user)
    # Creating a Stripe customer commits its ID. Recheck after that commit.
    order, payments = _payable_order(user, order_id)
    attempts = [payment for payment in payments if payment.stripe_payment_intent_id]
    previous = attempts[0] if attempts else None
    if previous is not None:
        try:
            intent = _client().v1.payment_intents.retrieve(previous.stripe_payment_intent_id)
        except stripe.StripeError:
            raise PaymentError("Unable to reach the payment service") from None
        _check_intent(intent, order, customer_id)
        if intent.status != "canceled":
            # Recover if Stripe succeeded before its webhook reached this server.
            if intent.status == "succeeded":
                _update_payment(intent.id, "succeeded")
            return intent.client_secret
        previous.status = "cancelled"

    # A retry after a connection or database failure must reuse the same intent.
    identity = f"{user.user_id}:{user.created_at}:{order.order_id}:{order.placed_at}"
    fingerprint = sha256(identity.encode()).hexdigest()[:32]
    # Version 2 avoids replaying requests rejected for the old method setting.
    # Existing saved intents are still reused above before creating anything.
    key = f"order-payment-v2-{fingerprint}-attempt-{len(attempts) + 1}"
    try:
        intent = _client().v1.payment_intents.create(
            params={
                "amount": _to_cents(order.price), "currency": "usd", "customer": customer_id,
                # Use the sandbox's enabled methods without redirect-based payments.
                "automatic_payment_methods": {"enabled": True, "allow_redirects": "never"},
                "description": f"Hairpiece order #{order.order_id}",
                "metadata": {"order_id": str(order.order_id), "user_id": str(user.user_id)},
            },
            options={"idempotency_key": key},
        )
    except stripe.StripeError as error:
        # Show the error type and field, without showing the secret key.
        error_type = type(error).__name__
        error_code = getattr(error, "code", None)
        error_field = getattr(error, "param", None)

        raise PaymentError(
            "Unable to start the payment. "
            f"Type: {error_type}; code: {error_code}; field: {error_field}"
        ) from None
    _check_intent(intent, order, customer_id)
    payment = Payment(
        order_id=order.order_id, payment_method="card", amount=order.price,
        payment_type="hairpiece_order", status="pending", stripe_payment_intent_id=intent.id,
    )
    try:
        db.session.add(payment)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        # The same Stripe intent may have been saved by a concurrent request.
        existing = db.session.execute(db.select(Payment).where(
            Payment.stripe_payment_intent_id == intent.id, Payment.order_id == order_id,
        )).scalar_one_or_none()
        if existing is None:
            raise
    if intent.status == "succeeded":
        _update_payment(intent.id, "succeeded")
    return intent.client_secret


def _payment_owner_query(user_id):
    # A payment can belong to an order or an appointment. Conflicting owners
    # are excluded instead of exposing one person's payment to another.
    return (
        db.select(Payment)
        .outerjoin(HairpieceOrder, Payment.order_id == HairpieceOrder.order_id)
        .outerjoin(Appointment, Payment.setmore_booking_id == Appointment.setmore_booking_id)
        .where(or_(
            and_(Payment.order_id.is_not(None), HairpieceOrder.user_id == user_id,
                 or_(Payment.setmore_booking_id.is_(None), Appointment.user_id == user_id)),
            and_(Payment.order_id.is_(None), Appointment.user_id == user_id),
        ))
    )


def _user_payments_query(user):
    return _payment_owner_query(user.user_id)


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
        parsed = date.fromisoformat(value)
        if parsed.isoformat() != value or not 1900 <= parsed.year <= 9998:
            raise ValueError
        return parsed
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

    user_id = args.get("user_id")
    if user_id:
        if not user_id.isascii() or not user_id.isdecimal() or not 1 <= int(user_id) <= 2147483647:
            errors["user_id"] = "Must be a number"
        else:
            filters["user_id"] = int(user_id)

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
    query = _payment_owner_query(filters["user_id"]) if "user_id" in filters else db.select(Payment)
    query = query.order_by(Payment.payment_id.desc())

    if "status" in filters:
        query = query.where(Payment.status == filters["status"])
    # Date filters use charged_at, so they only match payments that went through.
    if "from" in filters:
        start = start_of_day_utc(filters["from"])
        query = query.where(Payment.charged_at >= start)
    if "to" in filters:
        end = start_of_day_utc(filters["to"] + timedelta(days=1))
        query = query.where(Payment.charged_at < end)

    return db.session.execute(query).scalars().all()


def payment_with_customer(payment):
    """Admin view of a payment, including who paid."""
    order = payment.hairpiece_order
    appointment = payment.appointment
    customer = order.user if order else appointment.user if appointment else None
    if order and appointment and order.user_id != appointment.user_id:
        customer = None
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
    payment = db.session.execute(db.select(Payment).where(
        Payment.payment_id == payment.payment_id,
    ).with_for_update().execution_options(populate_existing=True)).scalar_one()
    if payment.status == "refunded":
        raise PaymentNotAllowed("This payment was already refunded", 409)
    if payment.status != "succeeded":
        raise PaymentNotAllowed("Only successful payments can be refunded", 409)
    if payment.payment_method != "card" or not payment.stripe_payment_intent_id:
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
    """Stop unpaid payments for an order that is being cancelled.

    Call this from the cancel-order endpoint before marking the order cancelled.
    """
    payments = (
        db.session.execute(
            db.select(Payment)
            .where(Payment.order_id == order.order_id)
        )
        .scalars()
        .all()
    )

    if any(p.status == "succeeded" for p in payments):
        raise PaymentNotAllowed("This order is already paid; refund it first", 409)

    for payment in payments:
        if payment.status not in ("pending", "failed"):
            continue
        # A cash record has no Stripe ID. Cancel only its local pending record.
        # The succeeded check above blocks both paid cash and paid card orders.
        if not payment.stripe_payment_intent_id:
            payment.status = "cancelled"
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
        event = stripe.Webhook.construct_event(payload, signature, secret)
    except (ValueError, stripe.SignatureVerificationError):
        # Anyone can POST to this URL; only requests signed with our secret count.
        raise PaymentError("Invalid webhook signature") from None

    try:
        if not isinstance(event.type, str):
            raise ValueError
        stripe_object = event.data.object
        if isinstance(stripe_object, stripe.StripeObject):
            stripe_object = stripe_object.to_dict()
        if not isinstance(stripe_object, dict):
            raise ValueError
    except (AttributeError, KeyError, TypeError, ValueError):
        raise PaymentError("Malformed webhook event") from None
    if event.type in ("setup_intent.succeeded", "payment_method.attached", "payment_intent.succeeded", "payment_intent.payment_failed", "payment_intent.canceled", "charge.refunded", "refund.created", "refund.updated", "refund.failed"):
        if not isinstance(stripe_object.get('id'), str):
            raise PaymentError("Malformed webhook event")
    if event.type == "setup_intent.succeeded":
        _save_card(stripe_object.get("customer"), stripe_object.get("payment_method"))
    elif event.type == "payment_method.attached":
        _save_card(stripe_object.get("customer"), stripe_object["id"])
    elif event.type == "payment_intent.succeeded":
        _update_payment(stripe_object["id"], "succeeded")
    elif event.type == "payment_intent.payment_failed":
        _update_payment(stripe_object["id"], "failed")
    elif event.type == "payment_intent.canceled":
        _update_payment(stripe_object["id"], "cancelled")
    elif event.type == "charge.refunded" and stripe_object.get("refunded") is True:
        intent_id = stripe_object.get("payment_intent")
        if not isinstance(intent_id, str):
            raise PaymentError("Malformed webhook event")
        _mark_refunded(intent_id)
    elif event.type in ("refund.created", "refund.updated", "refund.failed"):
        intent_id = stripe_object.get("payment_intent")
        if isinstance(intent_id, str):
            _mark_refunded(intent_id)


def _save_card(customer_id, payment_method_id):
    if not isinstance(customer_id, str) or not isinstance(payment_method_id, str):
        raise PaymentError("Malformed saved-card event")
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
        db.select(Payment).where(Payment.stripe_payment_intent_id == payment_intent_id).with_for_update()
        .execution_options(populate_existing=True)
    ).scalar_one_or_none()
    if payment is None or payment.status == "refunded":
        return

    # A refund can still be pending. Count only money Stripe says it refunded.
    try:
        refunds = _client().v1.refunds.list(params={"payment_intent": payment_intent_id, "limit": 100})
        refunded_cents = sum(
            refund.amount for refund in refunds.auto_paging_iter()
            if refund.status == "succeeded"
        )
    except stripe.StripeError:
        raise PaymentError("Unable to check the refund. Please retry the event.") from None
    if refunded_cents >= _to_cents(payment.amount):
        payment.status = "refunded"
        db.session.commit()
