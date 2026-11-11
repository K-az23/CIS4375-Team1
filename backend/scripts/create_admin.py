# built in python module / for securely typing passwords in terminal
from getpass import getpass

from sqlalchemy.exc import SQLAlchemyError

from app import create_app
from app.extensions import db
from app.models import Role, User
from app.utils.auth import hash_password


# to create an admin account, will be a script executable in backend
def create_admin():
    app = create_app()

    with app.app_context():
        email = input("Admin email: ").strip().lower()
        first_name = input("First name: ").strip()
        last_name = input("Last name: ").strip()
        phone = input("Phone: ").strip()
        password = getpass("Password: ")
        confirm_password = getpass("Confirm password: ")

        if password != confirm_password:
            print("Passwords do not match.")
            return

        existing_user = db.session.execute(
            db.select(User).where(User.email == email)
        ).scalar_one_or_none()

        if existing_user is not None:
            print("A user with that email already exists.")
            return

        admin_role = db.session.execute(
            db.select(Role).where(Role.name == "admin")
        ).scalar_one_or_none()

        if admin_role is None:
            print("Admin role was not found in the database.")
            return

        admin = User(
            role_id=admin_role.role_id,
            first_name=first_name,
            last_name=last_name,
            email=email,
            phone=phone,
            password_hash=hash_password(password),
            is_active=True,
        )

        try:
            db.session.add(admin)
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            print("Unable to create admin.")
            return

        print(f"Admin created successfully: {email}")

if __name__ == "__main__":
    create_admin()