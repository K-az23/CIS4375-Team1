from ..extensions import db


class ServiceCheckout(db.Model):
    __tablename__ = "service_checkouts"

    # One receipt per appointment prevents recording the same visit twice.
    setmore_booking_id = db.Column(
        db.String(100),
        db.ForeignKey("appointments.setmore_booking_id"),
        primary_key=True,
    )

    payment_id = db.Column(
        db.Integer,
        db.ForeignKey("payments.payment_id"),
        nullable=False,
        unique=True,
    )

    product_cost = db.Column(db.Numeric(14, 2), nullable=False)

    # Keep copies of the product names, quantities and costs at checkout.
    # Later inventory changes will not change an old receipt.
    products = db.Column(db.JSON, nullable=False)
    services = db.Column(db.JSON, nullable=False)