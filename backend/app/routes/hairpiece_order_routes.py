from flask import Blueprint, jsonify


hairpiece_order_bp = Blueprint(
    "hairpiece_orders",
    __name__,
    url_prefix="/api/hairpiece-orders"
)



# Customer Side Hairpiece Orders
# ------------


# POST /api/hairpiece-orders
@hairpiece_order_bp.route("", methods=["POST"])
def create_hairpiece_order():
    return jsonify({
        "success": False,
        "message": "Create hairpiece order endpoint not implemented yet."
    }), 501

# GET /api/hairpiece-orders
@hairpiece_order_bp.route("", methods=["GET"])
def get_hairpiece_orders():
    return jsonify({
        "success": False,
        "message": "Get authenticated customer's hairpiece orders endpoint not implemented yet."
    }), 501

# GET /api/hairpiece-orders/<order_id>
@hairpiece_order_bp.route("/<int:order_id>", methods=["GET"])
def get_hairpiece_order(order_id):
    return jsonify({
        "success": False,
        "message": "Get hairpiece order endpoint not implemented yet."
    }), 501

# POST /api/hairpiece-orders/<order_id>/cancel
@hairpiece_order_bp.route("/<int:order_id>/cancel", methods=["POST"])
def cancel_hairpiece_order(order_id):
    return jsonify({
        "success": False,
        "message": "Cancel hairpiece order endpoint not implemented yet."
    }), 501

# POST /api/hairpiece-orders/<order_id>/appointment
# TBD: Depends on Setmore integration and order-to-appointment DB relationship.
@hairpiece_order_bp.route("/<int:order_id>/appointment",methods=["POST"])
def create_order_appointment(order_id):
    return jsonify({
        "success": False,
        "message": "Order appointment workflow not finalized."
    }), 501



# Admin Hairpiece Orders Management
# Different live API endpoint for admin
# ----------------

admin_hairpiece_order_bp = Blueprint(
    "admin_hairpiece_orders",
    __name__,
    url_prefix="/api/admin/hairpiece-orders"
)


# GET /api/admin/hairpiece-orders
@admin_hairpiece_order_bp.route("", methods=["GET"])
def get_admin_hairpiece_orders():
    return jsonify({
        "success": False,
        "message": "Get all hairpiece orders endpoint not implemented yet."
    }), 501

# PATCH /api/admin/hairpiece-orders/<order_id>/status
@admin_hairpiece_order_bp.route("/<int:order_id>/status",methods=["PATCH"])
def update_hairpiece_order_status(order_id):
    return jsonify({
        "success": False,
        "message": "Update hairpiece order status endpoint not implemented yet."
    }), 501
