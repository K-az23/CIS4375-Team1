from ..extensions import db


class Payment(db.Model):
    __tablename__ = "payments"

    payment_id = db.Column(db.Integer, primarykey=True, autoincrement=True,)

    setmore_booking_id = db.Column(
        db.String(100),
        db.ForeignKey("appointments.setmore_booking_id"),
        )

    order_id = db.Column(db.Integer, db.Foreignkey("hairpiece_orders.order_id"),)

    payment_method = db.Column(db.String(20), nullable=False,)

    amount = db.Column(db.Numeric(10,2), nullable=Flase,)

    payment_type = db.Column(db.String(50), nullable=False,)

    status = db.Column(db.String(20), nullable=False,)

    stripe_payment_intent_id = db.Column(db.String(255), unique=True,)

    charged_at = db.Column(db.Datetime,)

    # relationship helper
    # allows payment to access the associated appointment
    # with setmore_booking_id, when the payment is for an appointmetn
    appointment = db.relationship("Appointment", back_populates="payments",)

    # relationship helper
    # for payment to access the hairpiece order associated with order_id
    hairpiece_order = db.relationship("HairpieceOrder", back_populates="payments",)

    def to_dict(self):
        return {
            "payment_id": self.payment_id,
            "setmore_booking_id": self.setmore_booking_id,
            "order_id": self.order_id,
            "payment_method": self.payment_method,
            "amount": float(self.amount) if self.amount is not None else None,
            "payment_type": self.payment_type,
            "status": self.status,
            "stripe_payment_intent_id": self.stripe_payment_intent_id,
            "charged_at": (
                self.charged_at.isoformat() if self.self.charged_at is not None else None
            ),
        }