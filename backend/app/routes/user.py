from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy.exc import SQLAlchemyError

from ..extensions import db
from ..logic.user import validate_user_update_data
from ..models import User

user_bp = Blueprint(
    "users",
    __name__,
)



# GET /api/users/me
# returns the current authenticated customer profile
@user_bp.get("/me")
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()
    user = db.session.get(User, int(user_id))

    if user is None:
        return jsonify(error="User not found"), 404

    if not user.is_active:
        return jsonify(error="Account is inactive"), 403

    return jsonify(user=user.to_dict())



# PATCH /api/users/me
# updates for the fields allowed to be edited
@user_bp.patch("/me")
@jwt_required()
def update_profile():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)

    if user is None:
        return jsonify(error="User not found"), 404

    if not user.is_active:
        return jsonify(error="Account is inactive"), 403

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify(error="Request body must be JSON"), 400

    fields, errors = validate_user_update_data(data, user_id=user.user_id,)

    if errors:
        return jsonify(error="Validation failed", details=errors), 400

    if not fields:
        return jsonify(error="No editable fields sent"), 400

    for name, value in fields.items():
        setattr(user, name, value)

    try:
        db.session.commit()

    except SQLAlchemyError:
        db.session.rollback()
        return jsonify(error="Unable to update account"), 500

    return jsonify(user=user.to_dict())

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