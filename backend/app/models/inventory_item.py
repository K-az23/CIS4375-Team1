from ..extensions import db


class InventoryItem(db.Model):
    __tablename__ = "inventory_items"

    item_id = db.Column(db.Integer, primary_key=True, autoincrement=True,)

    category_id = db.Column(
        db.Integer, 
        db.ForeignKey("item_categories.category_id"),
        nullable=False,
        )

    sku = db.Column(db.String(50), unique=True, )

    item_name = db.Column(db.String(100), nullable=False,)

    brand = db.Column(db.String(100),)

    measurment = db.Column(db.String(50), )

    price = db.Column(db.Numeric(10, 2), )

    item_type = db.Column(db.String(20),)

    quantity_on_hand = db.Column(db.Integer,)

    reorder_threshold = db.Column(db.Integer, )

    unit = db.Column(db.String(50), nullable=False,)

    is_active = db.Column(db.Boolean, nullable=False, )


    # helper
    # lets inventory items to access item categories
    category = db.relationship("ItemCategory", back_populates="inventory_items",)

    # helper
    # helps inventory items to access service mappings that use that item
    service_items = db.relationship("ServiceItem", back_populates="inventory_item",)

    # helper
    # connects inventory item to access all usage records associated with an item'
    usage_logs = db.relationship("UsageLog", back_populates="inventory_item",)

    # helper
    # connects inventory items to access all inventory adjustment records per item
    restock_logs = db.relationship("RestockLog", back_populates="inventory_item",)


    def to_dict(self):
        return {
            "item_id": self.item_id,
            "category_id": self.category_id,
            "sku": self.sku,
            "item_name": self.item_name,
            "brand": self.brand,
            "measurement": self.measurment,
            "price": float(self.price) if self.price is not None else None,
            "item_type": self.item_type,
            "quantity_on_hand": self.quantity_on_hand,
            "reorder_threshold": self.reorder_threshold,
            "unit": self.unit,
            "is_active": self.is_active,
        }