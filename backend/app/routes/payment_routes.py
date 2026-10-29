from flask import Blueprint, jsonify

payment_bp = Blueprint(
    "payments",
    __name__,
    url_prefix="/api/payments"
)

stripe_webhook_bp = Blueprint(
    "stripe_webhook",
    __name__,
    url_prefix="/api/webhooks"
)


# Exact payment timing/workflow is still awaiting business confirmation.


# Customer Payments
# ------------------


# POST /api/payments/create-intent
@payment_bp.route("/create-intent", methods=["POST"])
def create_payment_intent():
    return jsonify({
        "success": False,
        "message": "Create payment intent endpoint not implemented yet."
    }), 501

# POST /api/payments/setup-method
@payment_bp.route("/setup-method", methods=["POST"])
def setup_payment_method():
    return jsonify({
        "success": False,
        "message": "Setup payment method endpoint not implemented yet."
    }), 501

# GET /api/payments
@payment_bp.route("", methods=["GET"])
def get_payments():
    return jsonify({
        "success": False,
        "message": "Get customer payment history endpoint not implemented yet."
    }), 501

# GET /api/payments/<payment_id>
@payment_bp.route("/<int:payment_id>", methods=["GET"])
def get_payment(payment_id):
    return jsonify({
        "success": False,
        "message": "Get payment endpoint not implemented yet."
    }), 501



# Stripe webhook
# Webhook is the server-to-server notification, will tell the backend a payment event went through for the next proccess to occur.
# ---------------


# POST /api/webhooks/stripe
@stripe_webhook_bp.route("/stripe", methods=["POST"])
def stripe_webhook():
    return jsonify({
        "success": False,
        "message": "Stripe webhook endpoint not implemented yet."
    }), 501
