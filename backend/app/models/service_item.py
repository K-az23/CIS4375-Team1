from ..extensions import db


class ServiceItem(db.Model):
    __tablename__ = "service_item"

    service_item_id = db.Column(db.Integer, primary_key=True, autoincrement=True,)

    item_id = db.Column(db.Integer, db.ForeignKey("inventory_items.item_id"), nullable=False,)

    service_id = db.Column(db.Integer, db.ForeignKey("services.service_id"), nullable=False,)

    default_quantity_used = db.Column(db.Integer, )

    # relationship helper, not a column
    # helps service items to access to the inventory item associated
    inventory_item = db.relationship(
        "InventoryItem",
        back_populates="service_items",
    )

    # helps service items to access the service associated
    service = db.relationship(
        "Service",
        back_populates="service_items",
    )

    def to_dict(self):
        return{
            "service_item_id": self.service_item_id,
            "item_id": self.item_id,
            "service_id": self.service_id,
            "default_quantity_used": self.default_quantity_used,
            
        }