from ..extensions import db


class UsageLog(db.Model):
    __tablename__ = "usage_log"

    usage_log_id = db.Column(db.Integer, primary_key=True, autoincrement=True,)

    setmore_booking_id = db.Column(
        db.String(100),
        db.ForeignKey("appointments.setmore_booking_id"),
        nullable=False,
        )

    item_id = db.Column(
        db.Integer,
        db.ForeignKey("inventory_items.item_id"), 
        nullable=False,
        )

    quantity_used = db.Column(db.Integer, nullable=False,)

    # relationship helper
    # connects usage logs to access the associated appointments per log record
    appointment = db.relationship("Appointment", back_populates="usage_logs",)

    # connects usage log to access the inventory item assocaited with item_id
    inventory_item = db.relationship("InventoryItem", back_populates="usage_logs",)

    def to_dict(self):
        return{
            "usage_log_id": self.usage_log_id,
            "setmore_booking_id": self.setmore_booking_id,
            "item_id": self.item_id,
            "quantity_used": self.quantity_used,
        }

