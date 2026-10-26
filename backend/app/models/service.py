from ..extensions import db


class Service(db.Model):
    __tablename__ = "services"

    # Text for now; will become an auto-increment INT, with Setmore's ID
    # moved to its own setmore_service_id column.
    service_id = db.Column(db.Integer, primary_key=True, autoincrement=True,)
    setmore_service_id = db.Column(db.String(100), unique=True,)
    service_name = db.Column(db.String(100), nullable=False)
    duration_minutes = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Numeric(10, 2))
    description = db.Column(db.String(255),)
    is_active = db.Column(db.Boolean, nullable=False,)


    # relationship helper, not a column
    # simplifies queries by creating ORM navigation options
    # connects services to all appointments booked per service.
    appointments = db.relationship("Appointment", back_populates="service",)

    #helper
    # helps service to access the inventory mappings associated with that service
    service_items = db.relationship("ServiceItem", back_populates="service",)


    def to_public_dict(self):
        return {
            "service_id": self.service_id,
            "service_name": self.service_name,
            "description": self.description,
            "duration_minutes": self.duration_minutes,
            # MySQL returns DECIMAL, which Flask would send as a string;
            # the API returns money as a number.
            "price": float(self.price) if self.price is not None else None,
        }

    def to_admin_dict(self):
        # Matches the public version until is_active and setmore_service_id
        # are added to the table; admins will see both, the public won't.
        return {
            "service_id": self.service_id,
            "setmore_service_id": self.setmore_service_id,
            "service_name": self.service_name,
            "description": self.description,
            "duration_minutes": self.duration_minutes,
            "price": float(self.price) if self.price is not None else None,
            "is_active": self.is_active,
        }