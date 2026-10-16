from ..extensions import db


class Service(db.Model):
    __tablename__ = "services"

    # Text for now; will become an auto-increment INT, with Setmore's ID
    # moved to its own setmore_service_id column.
    service_id = db.Column(db.String(100), primary_key=True)
    service_name = db.Column(db.String(100), nullable=False)
    duration_minutes = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Numeric(10, 2))

    def to_public_dict(self):
        return {
            "service_id": self.service_id,
            "service_name": self.service_name,
            "duration_minutes": self.duration_minutes,
            # MySQL returns DECIMAL, which Flask would send as a string;
            # the API returns money as a number.
            "price": float(self.price) if self.price is not None else None,
        }