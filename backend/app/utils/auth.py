import bcrypt
from flask import current_app
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

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