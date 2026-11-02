from ..extensions import db

APPOINTMENT_STATUSES = ("booked", "completed", "cancelled", "no_show")


class Appointment(db.Model):
    __tablename__ = "appointments"

    setmore_booking_id = db.Column(db.String(100), primary_key=True)
    service_id = db.Column(
        db.Integer, db.ForeignKey("services.service_id"), nullable=False
    )
    # Optional: walk-in and phone bookings come from Setmore with no app account.
    user_id = db.Column(db.Integer, db.ForeignKey("users.user_id"))
    setmore_customer_id = db.Column(db.String(100))
    appointment_time = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(30), nullable=False, default="booked")
    cancellation_fee_charged = db.Column(db.Boolean, nullable=False, default=False)
    long_hair_surcharge = db.Column(db.Boolean, nullable=False, default=False)

    user = db.relationship("User", back_populates="appointments")
    service = db.relationship("Service", back_populates="appointments")
    payments = db.relationship("Payment", back_populates="appointment")
    usage_logs = db.relationship("UsageLog", back_populates="appointment")

    def to_public_dict(self):
        return {
            "setmore_booking_id": self.setmore_booking_id,
            "service_id": self.service_id,
            "user_id": self.user_id,
            "appointment_time": self.appointment_time.isoformat()
            if self.appointment_time
            else None,
            "status": self.status,
            "cancellation_fee_charged": self.cancellation_fee_charged,
            "long_hair_surcharge": self.long_hair_surcharge,
        }

    def to_admin_dict(self):
        return {
            **self.to_public_dict(),
            "setmore_customer_id": self.setmore_customer_id,
        }