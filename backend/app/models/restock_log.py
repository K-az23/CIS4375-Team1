from datetime import UTC, datetime

from ..extensions import db

RESTOCK_EVENT_TYPES = ("restock", "adjustment", "damaged", "expired")


class RestockLog(db.Model):
    __tablename__ = "restock_log"

    restock_log_id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(
        db.Integer, db.ForeignKey("inventory_items.item_id"), nullable=False
    )
    event_type = db.Column(db.String(30), nullable=False)
    # Positive adds stock, negative removes it.
    quantity_change = db.Column(db.Integer, nullable=False)
    logged_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(UTC)
    )

    inventory_item = db.relationship("InventoryItem", back_populates="restock_logs")

    def to_admin_dict(self):
        return {
            "restock_log_id": self.restock_log_id,
            "item_id": self.item_id,
            "event_type": self.event_type,
            "quantity_change": self.quantity_change,
            "logged_at": self.logged_at.isoformat() if self.logged_at else None,
        }