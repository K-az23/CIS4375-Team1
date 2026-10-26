from flask import Blueprint, jsonify


admin_user_bp = Blueprint(
    "admin_users",
    __name__,
    url_prefix="/api/admin/users"
)



# Admin User & Customer Management
# Not creating a DELETE, should keep customer records, order history, appointments, and payment.
# Can add a deactivate customer ~ or something alike
# --------------------------------


# GET /api/admin/users
@admin_user_bp.route("", methods=["GET"])
def get_admin_users():
    return jsonify({
        "success": False,
        "message": "Get admin user list endpoint not implemented yet."
    }), 501

# GET /api/admin/users/<user_id>
@admin_user_bp.route("/<int:user_id>", methods=["GET"])
def get_admin_user(user_id):
    return jsonify({
        "success": False,
        "message": "Get admin user endpoint not implemented yet."
    }), 501

# PATCH /api/admin/users/<user_id>
@admin_user_bp.route("/<int:user_id>", methods=["PATCH"])
def update_admin_user(user_id):
    return jsonify({
        "success": False,
        "message": "Update admin user endpoint not implemented yet."
    }), 501

# GET /api/admin/users/<user_id>/appointments
@admin_user_bp.route("/<int:user_id>/appointments", methods=["GET"])
def get_admin_user_appointments(user_id):
    return jsonify({
        "success": False,
        "message": "Get user appointments for admin endpoint not implemented yet."
    }), 501

# GET /api/admin/users/<user_id>/hairpiece-orders
@admin_user_bp.route("/<int:user_id>/hairpiece-orders", methods=["GET"])
def get_admin_user_hairpiece_orders(user_id):
    return jsonify({
        "success": False,
        "message": "Get user hairpiece orders for admin endpoint not implemented yet."
    }), 501

# GET /api/admin/users/<user_id>/payments
@admin_user_bp.route("/<int:user_id>/payments", methods=["GET"])
def get_admin_user_payments(user_id):
    return jsonify({
        "success": False,
        "message": "Get user payments for admin endpoint not implemented yet."
    }), 501

# GET /api/admin/users/<user_id>/timeline
@admin_user_bp.route("/<int:user_id>/timeline", methods=["GET"])
def get_admin_user_timeline(user_id):
    return jsonify({
        "success": False,
        "message": "Get user timeline endpoint not implemented yet."
    }), 501