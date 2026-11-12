from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..extensions import db
from ..logic.payment import (
    PaymentError,
    PaymentNotAllowed,
    # get_saved_card,  (card on file is turned off)
    get_user_payment,
    handle_stripe_event,
    list_all_payments,
    list_user_payments,
    payment_with_customer,
    refund_payment,
    # start_card_setup,  (card on file is turned off)
    start_order_payment,
    validate_payment_filters,
)
from ..models import Payment, User
from ..utils.auth import role_required

payment_bp = Blueprint("payment", __name__)
admin_payment_bp = Blueprint("admin_payment", __name__)
stripe_webhook_bp = Blueprint("stripe_webhook", __name__)


def _current_user():
    user = db.session.get(User, int(get_jwt_identity()))
    if user is None or not user.is_active:
        return None
    return user


# CARD ON FILE: turned off. No-show fees aren't charged, so the app doesn't
# save cards. Kept for reference in case the salon wants it later.
# # POST /api/payments/setup-method
# @payment_bp.post("/setup-method")
# @jwt_required()
# def setup_payment_method():
#     user = _current_user()
#     if user is None:
#         return jsonify(error="Account not found or inactive"), 403
#
#     try:
#         client_secret = start_card_setup(user)
#     except PaymentError as error:
#         return jsonify(error=str(error)), 502
#
#     return jsonify(client_secret=client_secret), 201
#
#
# # GET /api/payments/method
# @payment_bp.get("/method")
# @jwt_required()
# def get_payment_method():
#     user = _current_user()
#     if user is None:
#         return jsonify(error="Account not found or inactive"), 403
#
#     try:
#         card = get_saved_card(user)
#     except PaymentError as error:
#         return jsonify(error=str(error)), 502
#
#     return jsonify(payment_method=card)


# POST /api/payments/create-intent
@payment_bp.post("/create-intent")
@jwt_required()
def create_payment_intent():
    user = _current_user()
    if user is None:
        return jsonify(error="Account not found or inactive"), 403

    data = request.get_json(silent=True)
    order_id = data.get("order_id") if isinstance(data, dict) else None
    # bool is a subclass of int, so true/false must be rejected explicitly.
    if not isinstance(order_id, int) or isinstance(order_id, bool):
        return jsonify(error="order_id is required and must be a number"), 400

    try:
        client_secret = start_order_payment(user, order_id)
    except PaymentNotAllowed as error:
        return jsonify(error=str(error)), error.status
    except PaymentError as error:
        return jsonify(error=str(error)), 502

    return jsonify(client_secret=client_secret), 201

# GET /api/payments
@payment_bp.get("")
@jwt_required()
def get_payments():
    user = _current_user()
    if user is None:
        return jsonify(error="Account not found or inactive"), 403

    return jsonify(payments=[p.to_dict() for p in list_user_payments(user)])


# GET /api/payments/<payment_id>
@payment_bp.get("/<int:payment_id>")
@jwt_required()
def get_payment(payment_id):
    user = _current_user()
    if user is None:
        return jsonify(error="Account not found or inactive"), 403

    payment = get_user_payment(user, payment_id)
    if payment is None:
        return jsonify(error="Payment not found"), 404

    return jsonify(payment=payment.to_dict())

# GET /api/admin/payments?status=succeeded&from=2026-11-01&to=2026-11-30&user_id=5
@admin_payment_bp.get("")
@role_required("admin")
def get_admin_payments():
    filters, errors = validate_payment_filters(request.args)
    if errors:
        return jsonify(error="Validation failed", details=errors), 400

    payments = list_all_payments(filters)
    return jsonify(payments=[payment_with_customer(p) for p in payments])


# GET /api/admin/payments/<payment_id>
@admin_payment_bp.get("/<int:payment_id>")
@role_required("admin")
def get_admin_payment(payment_id):
    payment = db.session.get(Payment, payment_id)
    if payment is None:
        return jsonify(error="Payment not found"), 404

    return jsonify(payment=payment_with_customer(payment))

# POST /api/admin/payments/<payment_id>/refund
@admin_payment_bp.post("/<int:payment_id>/refund")
@role_required("admin")
def refund_admin_payment(payment_id):
    payment = db.session.get(Payment, payment_id)
    if payment is None:
        return jsonify(error="Payment not found"), 404

    try:
        payment = refund_payment(payment)
    except PaymentNotAllowed as error:
        return jsonify(error=str(error)), error.status
    except PaymentError as error:
        return jsonify(error=str(error)), 502

    return jsonify(payment=payment_with_customer(payment))

# POST /api/webhooks/stripe
# Called by Stripe, not the frontend, so it uses Stripe's signature instead of a login token.
@stripe_webhook_bp.post("/stripe")
def stripe_webhook():
    try:
        handle_stripe_event(
            request.get_data(),
            request.headers.get("Stripe-Signature"),
        )
    except PaymentError as error:
        return jsonify(error=str(error)), 400

    # Stripe retries any event that doesn't get a 2xx response.
    return jsonify(received=True)