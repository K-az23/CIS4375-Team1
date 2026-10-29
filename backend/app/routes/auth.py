from flask import Blueprint, jsonify, request
from sqlalchemy.exc import SQLAlchemyError

from ..extensions import db
from ..logic.auth import (
    email_taken,
    get_customer_role,
    validate_registration_data,
)
from ..models import User
from ..utils.auth import hash_password

auth_bp = Blueprint(
    "auth",
    __name__,
)



# POST /api/auth/register
@auth_bp.post("/register")
def register():
     data = request.get_json(silent=True)

     if not isinstance(data, dict):
        return jsonify(
            error = "Request body must be JSON"
        ), 400

     fields, errors = validate_registration_data(data)

     if errors:
         return jsonify(
             error="Validation failed",
             details = errors,
         ), 400
     if email_taken(fields["email"]):
         return jsonify(error="An account with this email already exists"), 409
    # On default all accounts are Customer Roles only
     customer_role = get_customer_role()


     # ensuring a customer is on a Customer Role
     if customer_role is None:
         return jsonify(error="Account registration is temporarily unavailable"), 500

     password_hash = hash_password(fields["password"])

     user = User(
         role_id=customer_role.role_id,
         first_name=fields["first_name"],
         last_name=fields["last_name"],
         email=fields["email"],
         phone = fields["phone"],
         password_hash=password_hash,

         # these will be managed by the admin side, but still attached per user
         no_show_count=0,
         is_member=False,
         is_active=True,
     )

     try:
         db.session.add(user)
         db.session.commit()

     except SQLAlchemyError:
         # if failed, allowing roll back to allow session to continue
         db.session.rollback()

        # failure message for clients/users
         return jsonify(error="Unable to create account"),500

     return jsonify(user=user.to_user_dict()), 201

# POST /api/auth/login
@auth_bp.route("/login", methods=["POST"])
def login():
    return jsonify({
        "success": False,
        "message": "Login endpoint not implemented yet."
    }), 501

# POST /api/auth/logout
@auth_bp.route("/logout", methods=["POST"])
def logout():
    return jsonify({
        "success": False,
        "message": "Logout endpoint not implemented yet."
    }), 501

# POST /api/auth/forgot-password
@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    return jsonify({
        "success": False,
        "message": "Forgot password endpoint not implemented yet."
    }), 501

# POST /api/auth/reset-password
@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    return jsonify({
        "success": False,
        "message": "Reset password endpoint not implemented yet."
    }), 501

# GET /api/auth/me
@auth_bp.route("/me", methods=["GET"])
def get_auth_user():
    return jsonify({
        "success": False,
        "message": "Authenticated user endpoint not implemented yet."
    }), 501