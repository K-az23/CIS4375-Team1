from flask import Blueprint, jsonify

user_bp = Blueprint(
    "users",
    __name__,
    url_prefix="/api/users"
)



# GET /api/users/me
@user_bp.route("/me", methods=["GET"])
def get_current_user():
    return jsonify({
        "success": False,
        "message": "Get current user profile endpoint not implemented yet"
    }), 501

# PATCH /api/users/me
@user_bp.route("/me", methods=["PATCH"])
def update_current_user():
    return jsonify({
        "success": False,
        "message": "Update current user profile endpoint not implemented yet"
    }), 501

# GET /api/users/me/hairpiece-orders
@user_bp.route("/me/hairpiece-orders", methods=["GET"])
def get_current_user_hairpiece_orders():
    return jsonify({
        "success": False,
        "message": "Get current user hairpiece orders endpoint not implemented yet"
    }), 501

# GET /api/users/me/appointments
@user_bp.route("/me/appointments", methods=["GET"])
def get_current_user_appointments():
    return jsonify({
        "success": False,
        "message": "Get current user appointments endpoint not implemented yet."
    }), 501

# GET /api/users/me/payments
@user_bp.route("/me/payments", methods=["GET"])
def get_current_user_payments():
    return jsonify({
        "success": False,
        "message": "Get current user payment history endpoint not implemented yet."
    }), 501



# Below this comment are TBD routes:
# Saved hair specs are not current being represented in the ERD
# Routes will wait to be implemented until the schema is done


# GET /api/users/me/hair-specifications
@user_bp.route("/me/hair-specifications", methods=["GET"])
def get_current_user_hair_specifications():
    return jsonify({
        "success": False,
        "message": "Hair specification schema not finalized."
    }), 501

# POST /api/users/me/hair-specifications
@user_bp.route("/me/hair-specifications", methods=["POST"])
def create_current_user_hair_specification():
    return jsonify({
        "success": False,
        "message": "Hair specification schema not finalized."
    }), 501

# PATCH /api/users/me/hair-specifications/<id>
@user_bp.route("/me/hair-specifications/<int:specification_id>", methods=["PATCH"])
def update_current_user_hair_specification(specification_id):
    return jsonify({
        "success": False,
        "message": "Hair specification schema not finalized."
    }), 501