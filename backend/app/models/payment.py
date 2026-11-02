from datetime import UTC, datetime

from ..extensions import db

PAYMENT_METHODS = ("card", "cash")
PAYMENT_TYPES = (
    "service",
    "deposit",
    "cancellation_fee",
    "no_show_fee",
    "hairpiece_order",
)
PAYMENT_STATUSES = ("pending", "succeeded", "failed", "refunded")


class Payment(db.Model):
    __tablename__ = "payments"

    payment_id = db.Column(db.Integer, primary_key=True)
    # A payment belongs to an appointment or a hairpiece order, never both.
    setmore_booking_id = db.Column(
        db.String(100), db.ForeignKey("appointments.setmore_booking_id")
    )
    order_id = db.Column(db.Integer, db.ForeignKey("hairpiece_orders.order_id"))
    payment_method = db.Column(db.String(20), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    payment_type = db.Column(db.String(50), nullable=False)
    status = db.Column(db.String(20), nullable=False, default="pending")
    stripe_payment_intent_id = db.Column(db.String(255), unique=True)
    charged_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(UTC)
    )

    appointment = db.relationship("Appointment", back_populates="payments")
    hairpiece_order = db.relationship("HairpieceOrder", back_populates="payments")

    def to_public_dict(self):
        return {
            "payment_id": self.payment_id,
            "setmore_booking_id": self.setmore_booking_id,
            "order_id": self.order_id,
            "payment_method": self.payment_method,
            "amount": float(self.amount),
            "payment_type": self.payment_type,
            "status": self.status,
            "charged_at": self.charged_at.isoformat() if self.charged_at else None,
        }

    def to_admin_dict(self):
        return {
            **self.to_public_dict(),
            "stripe_payment_intent_id": self.stripe_payment_intent_id,
        }