from ..extensions import db


class Appointment(db.Model):
    __tablename__ = "appointments"

    setmore_booking_id = db.Column(db.String(100), primary_key=True,)

    service_id = db.Column(db.Integer, db.ForeignKey("services.service_id"), nullable=False,)

    user_id = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=False,)

    appointment_time = db.Column(db.DateTime, nullable=False,)

    status = db.Column(db.String(30), nullable=False,)

    cancellation_fee_charged = db.Column(db.Boolean,)

    long_hair_surcharge = db.Column(db.Boolean, )

    # relationship helper, not column
    # connects appointments to the associated users
    user = db.relationship(
        "User",
        back_populates="appointments"
    )

    # connects appointment to the services booked for the appointment
    service = db.relationship(
        "Service",
        back_populates="appointments",
    )

    # connects appointments to access payments associated
    payments = db.relationship(
        "Payment",
        back_populates="appointment",
    )

    # connects appointments to access the inventory usage records associated
    usage_logs = db.relationship(
        "UsageLog",
        back_populates="appointment",
    )



    def to_dict(self):
        return {
            "setmore_booking_id": self.setmore_booking_id,
            "service_id": self.service_id,
            "user_id": self.user_id,
            "appointment_time": self.appointment_time.isoformat() 
            if self.appointment_time is not None else None,
            "status": self.status,
            "cancellation_fee_charged": self.cancellation_fee_charged,
            "long_hair_surcharge": self.long_hair_surcharge,
        }