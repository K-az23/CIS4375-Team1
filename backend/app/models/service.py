from ..extensions import db


class Service(db.Model):
    __tablename__ = "services"

    service_id = db.Column(db.Integer, primary_key=True)
    service_name = db.Column(db.String(100), nullable=False, unique=True)
    duration_minutes = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    description = db.Column(db.String(255))
    setmore_service_id = db.Column(db.String(100), unique=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    def to_public_dict(self):
        return {
            "service_id": self.service_id,
            "service_name": self.service_name,
            "description": self.description,
            "duration_minutes": self.duration_minutes,
            # MySQL returns DECIMAL, which Flask would send as a string;
            # the API returns money as a number.
            "price": float(self.price),
        }

    def to_admin_dict(self):
        return {
            **self.to_public_dict(),
            "setmore_service_id": self.setmore_service_id,
            "is_active": self.is_active,
        }