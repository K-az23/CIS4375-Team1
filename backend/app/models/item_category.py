from ..extensions import db


class ItemCategory(db.Model):
    __tablename__ = "item_categories"

    category_id = db.Column(db.Integer, primary_key=True, autoincrement=True,)

    category_name = db.Column(db.String(100), nullable=False,)

    description = db.Column(db.String(255),)

    # using boolean to represent tinyint(1),
    # will let us use True/False insted of 1/0
    is_active = db.Column(db.Boolean, nullable=False,)

    # relationship helper; not a database column
    # for category table to have access to all inventory items, 
    # will make some APIs easier to write
    inventory_items = db.relationship("InventoryItem", back_populates="category",)

    def to_dict(self):
        return {
            "category_id": self.category_id,
            "category_name": self.category_name,
            "description": self.description,
            "is_active": self.is_active,
        }