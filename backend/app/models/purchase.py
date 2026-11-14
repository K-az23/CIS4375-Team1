from datetime import UTC, datetime

from ..extensions import db

PURCHASE_STATUSES = ('pending', 'ordered', 'received', 'cancelled')


def utc_now():
    return datetime.now(UTC).replace(tzinfo=None)


def timestamp(value):
    return value.replace(tzinfo=UTC).isoformat().replace('+00:00', 'Z') if value else None


# Supplier purchases are separate from customer orders and inventory counts.
class Purchase(db.Model):
    __tablename__ = 'purchases'

    purchase_id = db.Column(db.Integer, primary_key=True)
    supplier_name = db.Column(db.String(120), nullable=False)
    item_name = db.Column(db.String(200), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), nullable=False, default='pending')
    ordered_at = db.Column(db.DateTime)
    received_at = db.Column(db.DateTime)
    notes = db.Column(db.String(2000), nullable=False, default='')
    created_at = db.Column(db.DateTime, nullable=False, default=utc_now)
    updated_at = db.Column(db.DateTime, nullable=False, default=utc_now)
    # This number prevents one person's older form from overwriting a newer save.
    version = db.Column(db.Integer, nullable=False, default=1)

    __table_args__ = (
        db.CheckConstraint('quantity > 0', name='purchase_positive_quantity'),
    )

    def to_dict(self):
        return {
            'purchase_id': self.purchase_id,
            'supplier_name': self.supplier_name,
            'item_name': self.item_name,
            'quantity': self.quantity,
            'status': self.status,
            'ordered_at': timestamp(self.ordered_at),
            'received_at': timestamp(self.received_at),
            'notes': self.notes,
            'created_at': timestamp(self.created_at),
            'updated_at': timestamp(self.updated_at),
            'version': self.version,
        }
