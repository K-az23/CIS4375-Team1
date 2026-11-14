from datetime import UTC, datetime
from ..extensions import db


class OrderAppointment(db.Model):
    # Keep the appointment link separate so existing order columns stay intact.
    __tablename__ = 'order_appointment_links'
    order_id = db.Column(db.Integer, db.ForeignKey('hairpiece_orders.order_id'), primary_key=True)
    setmore_booking_id = db.Column(db.String(100), db.ForeignKey('appointments.setmore_booking_id'), nullable=False)
    linked_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(UTC).replace(tzinfo=None))
