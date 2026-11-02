from datetime import UTC, datetime

from ..extensions import db

# Matches the rows in the roles table.
CUSTOMER_ROLE_ID = 1
EMPLOYEE_ROLE_ID = 2
ADMIN_ROLE_ID = 3


class User(db.Model):
    __tablename__ = "users"

    user_id = db.Column(db.Integer, primary_key=True)
    role_id = db.Column(
        db.Integer,
        db.ForeignKey("roles.role_id"),
        nullable=False,
        default=CUSTOMER_ROLE_ID,
    )
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(255), nullable=False, unique=True)
    # Optional and shareable: family members may book under one number.
    phone = db.Column(db.String(20))
    password_hash = db.Column(db.String(255), nullable=False)
    no_show_count = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(UTC)
    )
    stripe_customer_id = db.Column(db.String(255))
    stripe_payment_method_id = db.Column(db.String(255))
    setmore_customer_id = db.Column(db.String(100), unique=True)
    setmore_staff_id = db.Column(db.String(100), unique=True)
    is_member = db.Column(db.Boolean, nullable=False, default=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    role = db.relationship("Role", back_populates="users")
    hairpiece_orders = db.relationship("HairpieceOrder", back_populates="user")
    appointments = db.relationship("Appointment", back_populates="user")

    # password_hash and the Stripe/Setmore ids are never sent to the browser.
    def to_public_dict(self):
        return {
            "user_id": self.user_id,
            # The frontend reads role to choose customer vs admin pages.
            "role": self.role.name if self.role else None,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "email": self.email,
            "phone": self.phone,
            "is_member": self.is_member,
        }

    def to_admin_dict(self):
        return {
            **self.to_public_dict(),
            "no_show_count": self.no_show_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "is_active": self.is_active,
        }