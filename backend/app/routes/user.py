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