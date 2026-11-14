from functools import wraps
from hashlib import sha256
from hmac import compare_digest

import bcrypt
from flask import current_app, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from ..extensions import db
from ..models import User


def hash_password(password):
    # Store a password hash instead of the person's actual password.
    password_byt = password.encode("utf-8")

    hashed_password = bcrypt.hashpw(
        password_byt,
        bcrypt.gensalt(),
    )

    return hashed_password.decode("utf-8")


def check_password(password, password_hash):
    # bcrypt accepts at most 72 bytes. A longer password is incorrect.
    # Do not shorten it, because that could accept a different password.
    if not isinstance(password, str) or len(password.encode("utf-8")) > 72:
        return False

    return bcrypt.checkpw(
        password.encode("utf-8"),
        password_hash.encode("utf-8"),
    )


def create_password_reset_token(user_id):
    user = db.session.get(User, user_id)

    if user is None or not user.is_active:
        raise ValueError("An active account is required")

    serializer = URLSafeTimedSerializer(current_app.config["SECRET_KEY"])

    # Tie the link to the current password. Changing the password makes
    # every earlier reset link stop working. No database column is needed.
    password_check = sha256(
        user.password_hash.encode("utf-8")
    ).hexdigest()

    return serializer.dumps(
        {
            "user_id": user_id,
            "password_check": password_check,
        },
        salt="password-reset",
    )


def verify_password_reset_token(token, max_age=1800):
    serializer = URLSafeTimedSerializer(current_app.config["SECRET_KEY"])

    try:
        data = serializer.loads(
            token,
            salt="password-reset",
            max_age=max_age,
        )
    except (SignatureExpired, BadSignature):
        return None

    if not isinstance(data, dict):
        return None

    user_id = data.get("user_id")
    password_check = data.get("password_check")

    if type(user_id) is not int or not isinstance(password_check, str):
        return None

    user = db.session.get(User, user_id)

    if user is None or not user.is_active:
        return None

    current_check = sha256(
        user.password_hash.encode("utf-8")
    ).hexdigest()

    if not compare_digest(password_check, current_check):
        return None

    return user_id


def role_required(required_role):
    # Check the current account and role before allowing an admin action.
    def decorator(function):
        @wraps(function)
        @jwt_required()
        def wrapper(*args, **kwargs):
            user_id = int(get_jwt_identity())
            user = db.session.get(User, user_id)

            if user is None:
                return jsonify(error="User not found"), 404

            if not user.is_active:
                return jsonify(error="Account is inactive"), 403

            if user.role is None or user.role.name != required_role:
                return jsonify(error="Forbidden"), 403

            return function(*args, **kwargs)

        return wrapper

    return decorator