from ..extensions import db


class RestockLog(db.Model):
    __tablename__ = "restock_log"

    restock_log_id = db.Column(db.Integer, primary_key=True, autoincrement=True,)

    item_id = db.Column(db.Integer, db.ForeignKey("inventory_items.item_id"), nullable=False,)

    event_type = db.Column(db.String(30), nullable=False,)

    quantity_change = db.Column(db.Integer, nullable=False,)

    logged_at = db.Column(db.DateTime,)

    # relationship helper, not a column
    # will help restock log to access inventory item associated with restock records
    inventory_item = db.relationship(
        "InventoryItem",
        back_populates="restock_logs",
    )

    def to_dict(self):
        return{
            "restock_log_id": self.restock_log_id,
            "item_id": self.item_id,
            "event_type": self.event_type,
            "quantity_change": self.quantity_change,
            "logged_at": (
                self.logged_at.isoformat()
                if self.self.logged_at is not None else None
            ),
        }

