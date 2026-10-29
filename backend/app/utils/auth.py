import bcrypt

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
