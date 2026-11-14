from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import (
    create_access_token,
    get_jwt_identity,
    jwt_required,
)
from sqlalchemy.exc import SQLAlchemyError

from ..extensions import db
from ..logic.auth import (
    email_taken,
    get_customer_role,
    get_user_by_email,
    validate_change_password_data,
    validate_forgot_password_data,
    validate_login_data,
    validate_registration_data,
    validate_reset_password_data,
)
from ..logic.email_notif import (
    EmailError,
    _smtp_settings,
    send_password_reset_email,
)
from ..models import User
from ..utils.auth import (
    check_password,
    create_password_reset_token,
    hash_password,
    verify_password_reset_token,
)

auth_bp = Blueprint("auth", __name__)


# Create customer accounts using the existing registration rules.
@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify(error="Request body must be JSON"), 400

    fields, errors = validate_registration_data(data)

    if errors:
        return jsonify(
            error="Validation failed",
            details=errors,
        ), 400

    if email_taken(fields["email"]):
        return jsonify(
            error="An account with this email already exists"
        ), 409

    customer_role = get_customer_role()

    if customer_role is None:
        return jsonify(
            error="Account registration is temporarily unavailable"
        ), 500

    password_hash = hash_password(fields["password"])

    user = User(
        role_id=customer_role.role_id,
        first_name=fields["first_name"],
        last_name=fields["last_name"],
        email=fields["email"],
        phone=fields["phone"],
        password_hash=password_hash,
        no_show_count=0,
        is_member=False,
        is_active=True,
    )

    try:
        db.session.add(user)
        db.session.commit()

    except SQLAlchemyError:
        db.session.rollback()
        return jsonify(error="Unable to create account"), 500

    return jsonify(user=user.to_dict()), 201


# Check the password and return a token for the signed-in user.
@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify(error="Request body must be JSON"), 400

    fields, errors = validate_login_data(data)

    if errors:
        return jsonify(
            error="Validation failed",
            details=errors,
        ), 400

    user = get_user_by_email(fields["email"])

    if user is None or not check_password(
        fields["password"],
        user.password_hash,
    ):
        return jsonify(error="Invalid email or password"), 401

    if not user.is_active:
        return jsonify(error="Account is inactive"), 403

    access_token = create_access_token(
        identity=str(user.user_id)
    )

    return jsonify(
        access_token=access_token,
        user=user.to_dict(),
    )


@auth_bp.post("/logout")
@jwt_required()
def logout():
    # The frontend removes its saved token after this request.
    return jsonify(message="Logged out successfully")


# Validate the address and send a reset link for an active account.
@auth_bp.post("/forgot-password")
def forgot_password():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify(error="Request body must be JSON"), 400

    fields, errors = validate_forgot_password_data(data)

    if errors:
        return jsonify(
            error="Validation failed",
            details=errors,
        ), 400

    # Do not promise an email when the email service has no settings.
    try:
        _smtp_settings()
    except EmailError:
        return jsonify(
            error="Password reset email is not configured yet"
        ), 503

    user = get_user_by_email(fields["email"])

    response = {
        "message": (
            "If an active account exists for that email, "
            "a reset link has been sent."
        )
    }

    # Use the same response for unknown addresses to keep accounts private.
    if user is None or not user.is_active:
        return jsonify(response)

    reset_token = create_password_reset_token(user.user_id)

    try:
        send_password_reset_email(
            user.email,
            reset_token,
        )

    except EmailError:
        current_app.logger.warning(
            "Password reset email could not be sent"
        )

        return jsonify(
            error=(
                "Unable to send the reset email. "
                "Please try again later."
            )
        ), 502

    return jsonify(response)


# Check the reset link before saving the new password.
@auth_bp.post("/reset-password")
def reset_password():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify(error="Request body must be JSON"), 400

    fields, errors = validate_reset_password_data(data)

    if errors:
        return jsonify(
            error="Validation failed",
            details=errors,
        ), 400

    user_id = verify_password_reset_token(fields["token"])

    if user_id is None:
        return jsonify(
            error="Password reset link is invalid or expired"
        ), 400

    user = db.session.get(User, user_id)

    if user is None or not user.is_active:
        return jsonify(
            error="Password reset link is invalid or expired"
        ), 400

    new_password_hash = hash_password(fields["password"])

    try:
        # Save only if the password has not changed since checking the link.
        # If two requests use the same link together, only one can succeed.
        result = db.session.execute(
            db.update(User)
            .where(
                User.user_id == user_id,
                User.password_hash == user.password_hash,
                User.is_active.is_(True),
            )
            .values(password_hash=new_password_hash)
            .execution_options(synchronize_session=False)
        )

        if result.rowcount != 1:
            db.session.rollback()
            return jsonify(
                error="Password reset link is invalid or expired"
            ), 400

        db.session.commit()

    except SQLAlchemyError:
        db.session.rollback()
        return jsonify(error="Unable to reset password"), 500

    return jsonify(
        message="Password has successfully been reset!"
    )


# Restore the signed-in user's details after a browser refresh.
@auth_bp.get("/me")
@jwt_required()
def get_me():
    user_id = get_jwt_identity()
    user = db.session.get(User, int(user_id))

    if user is None:
        return jsonify(error="User not found"), 404

    if not user.is_active:
        return jsonify(error="Account is inactive"), 403

    return jsonify(user=user.to_dict())


# Preserve main's password-change feature for signed-in users.
@auth_bp.post("/change-password")
@jwt_required()
def change_password():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify(error="Request body must be JSON"), 400

    fields, errors = validate_change_password_data(data)

    if errors:
        return jsonify(
            error="Validation failed",
            details=errors,
        ), 400

    user = db.session.get(User, int(get_jwt_identity()))

    if user is None or not user.is_active:
        return jsonify(error="Account not found or inactive"), 403

    if not check_password(
        fields["current_password"],
        user.password_hash,
    ):
        # The login is still valid. Only the typed password is wrong.
        # Return 400 so the frontend keeps the user signed in.
        return jsonify(
            error="Validation failed",
            details={"current_password": "Incorrect password"},
        ), 400

    user.password_hash = hash_password(fields["new_password"])

    try:
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify(error="Unable to change password"), 500

    return jsonify(message="Password changed")