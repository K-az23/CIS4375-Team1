from ..extensions import db


class ItemCategory(db.Model):
    __tablename__ = "item_categories"

    category_id = db.Column(db.Integer, primary_key=True)
    category_name = db.Column(db.String(100), nullable=False, unique=True)
    description = db.Column(db.String(255))
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    inventory_items = db.relationship("InventoryItem", back_populates="category")

    def to_admin_dict(self):
        return {
            "category_id": self.category_id,
            "category_name": self.category_name,
            "description": self.description,
            "is_active": self.is_active,
        }