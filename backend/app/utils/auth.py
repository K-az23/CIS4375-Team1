from functools import wraps

import bcrypt
from flask import current_app, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from ..extensions import db
from ..models import User

# password creation
# user types password -> received in a plaintext through request memory -> bcrypt hashes it and only the hash is saved
# -> request finishes and the plaintext disappears from request memory 

# password auth
# user types password -> temporarily received in plaintext -> bcrypt.checkpw compares -> 
# if allowed, authentication granted -> backend can issue JWT

def hash_password(password):
    # Passwords are hashed before storage so plaintext passwords are never written to the DB
    password_byt = password.encode("utf-8")

    hashed_password = bcrypt.hashpw(
        password_byt,
        bcrypt.gensalt(),
    )

    return hashed_password.decode("utf-8")


def check_password(password, password_hash):
    # to be used during login to compare a plaintext password with the bcrypt hash stored in db
    return bcrypt.checkpw(
        password.encode("utf-8"),
        password_hash.encode("utf-8"),
    )


# ----- password reset tokens

# creates a signed token used for resetting a password
def create_password_reset_token(user_id):
    serializer = URLSafeTimedSerializer(current_app.config["SECRET_KEY"])

    return serializer.dumps(
        {"user_id": user_id},
        salt="password-reset",
    )

# validating the password token and returing to user, link expires in 30min
def verify_password_reset_token(token, max_age=1800):
    serializer = URLSafeTimedSerializer(current_app.config["SECRET_KEY"])

    try:
        data = serializer.loads(
            token,
            salt="password-reset",
            max_age=max_age,
        )
        return data.get("user_id")
    except (SignatureExpired, BadSignature):
        return None



# -------- restrics routes to authenticated users within their required role
# this will let us proctect routes by simply using @role_required("admin")
# will load user attempting, checks if active and that their current role must be admin
def role_required(required_role):

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