from ..extensions import db


class HairpieceOrder(db.Model):
    __tablename__ = "hairpiece_orders"

    order_id = db.Column(db.Integer, primary_key=True, autoincrement=True,)

    user_id = db.Column(db.Integer, db.Foreignkey("users.user_id"), nullable=False,)

    order_type = db.Column(db.String(50), )

    price = db.Column(db.Numeric(10, 2), nullable=False,)

    color_code = db.Column(db.String(10),)

    grey_percentage = db.Column(db.Integer,)

    density = db.Column(db.String(20),)

    skin_type = db.Column(db.String(20),)

    base_type = db.Column(db.String(20),)

    dimensions = db.Column(db.String(100),)

    order_status = db.Column(db.String(30), nullable=False, )

    placed_at = db.Column(db.DateTime, )

    # relationship helper, not a database column
    # for hairpiece order to access the user who placed the order
    user = db.relationship(
        "User",
        back_populates="hairpiece_orders",
    )


    def to_dict(self):
        return{
            "order_id": self.order_id,
            "user_id": self.user_id,
            "order_type": self.order_type,
            "price": float(self.price) if self.price is not None else None,
            "color_code": self.color_code,
            "grey_percentage": self.grey_percentage,
            "density": self.density,
            "skin_type": self.skin_type,
            "base_type": self.base_type,
            "dimensions": self.dimensions,
            "order_status": self.order_status,
            "place_at": self.placed_at.isoformat() if self.placed_at is not None else None,
        }