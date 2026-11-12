from flask import Blueprint, jsonify, request
from sqlalchemy.exc import SQLAlchemyError

from ..extensions import db
from ..logic.user import get_admin_customers, validate_admin_user_update_data
from ..models import User
from ..utils.auth import role_required

admin_user_bp = Blueprint(
    "admin_users",
    __name__,
)



# Admin User & Customer Management
# Not creating a DELETE, should keep customer records, order history, appointments, and payment.
# Can add a deactivate customer ~ or something alike
# --------------------------------


# GET /api/admin/users
# returns all users
@admin_user_bp.get("")
@role_required("admin")
def list_users():
    customers = get_admin_customers()

    users = []

    for user, last_visit in customers:
        user_data = user.to_admin_dict()

        user_data["last_visit"] = (
            last_visit.isoformat()
            if last_visit is not None
            else None
        )

        users.append(user_data)

    return jsonify(users=users), 200


# GET /api/admin/users/<user_id>
# returns a specific user (only customers)
@admin_user_bp.get("/<int:user_id>")
@role_required("admin")
def get_user(user_id):
    user = db.session.get(User, user_id)

    if user is None or user.role is None or user.role.name != "customer":
        return jsonify(error = "Customer not found"), 404
    
    return jsonify(user=user.to_admin_dict())


# PATCH /api/admin/users/<user_id>
# Updates admin managed fields for customers or employees
@admin_user_bp.patch("/<int:user_id>")
@role_required("admin")
def update_user(user_id):
    user = db.session.get(User, user_id)

    if user is None or user.role is None or user.role.name not in ("customer", "employee",):
        return jsonify(error="User not found"), 404

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify(error="Request body must be JSON"), 400

    fields, errors = validate_admin_user_update_data(data)

    if errors:
        return jsonify(error = "Validation failed", details=errors), 400

    if not fields:
        return jsonify(error="No admin editable fields sent"), 400

    # validation for fields being updated
    for name, value in fields.items():
        setattr(user, name, value)

    try:
        db.session.commit()

    except SQLAlchemyError:
        db.session.rollback()
        return jsonify(error="Unable to update account"), 500

    return jsonify(user=user.to_admin_dict())