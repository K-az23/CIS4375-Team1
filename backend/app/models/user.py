from ..extensions import db


class User(db.Model):
    __tablename__ = "users"

    user_id = db.Column(
        db.Integer,
        primary_key=True,
        autoincrement=True,
    )

    role_id = db.Column(
        db.Integer,
        db.ForeignKey("roles.role_id"),
        nullable=False,
        )

    first_name = db.Column(db.String(100), nullable=False,)

    last_name = db.Column(db.String(100), nullable=False,)

    email = db.Column(db.String(255), nullable=False, unique=True,)

    phone = db.Column(db.String(20), nullable=False, unique=True,)

    password_hash = db.Column(db.String(255), nullable=False,)

    no_show_count = db.Column(db.Integer,)

    created_at = db.Column(db.DateTime,)

    stripe_customer_id = db.Column(db.String(255),)

    stripe_payment_method_id = db.Column(db.String(255),)

    setmore_customer_id = db.Column(db.String(100),)

    setmore_staff_id = db.Column(db.String(100),)

    is_member = db.Column(db.Boolean, nullable=False,)

    is_active = db.Column(db.Boolean, nullable=False,)

    # relationshp helper
    # makes routing easier to pull roles from users
    role = db.relationship("Role", back_populates="users",)

    # connects user hairpiece oorders to all hairpiece orders
    hairpiece_orders = db.relationship("HairpieceOrder", back_populates="user",) 

    # conncets users to all their appointments
    appointments = db.relationship("Appointment", back_populates="user",)


    # not dumping every column into JSON such as:
    # password_hash, stripe and setmore id, and stripe payment method
    def to_dict(self):
        return {
            "user_id": self.user_id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "email": self.email,
            "phone": self.phone,
            "is_member": self.is_member,
        }

    def to_admin_dict(self):
        # used for admin side
        return{
            "user_id": self.user_id,
            "role": self.role.name if self.role else None,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "email": self.email,
            "phone": self.phone,
            "no_show_count": self.no_show_count,
            "created_at": (
                self.created_at.isoformat()
                if self.created_at is not None
                else None
            ),
            "is_member": self.is_member,
            "is_active": self.is_active,
        }