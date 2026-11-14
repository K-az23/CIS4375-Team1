from datetime import UTC, datetime

from ..extensions import db


def utc_now():
    return datetime.now(UTC).replace(tzinfo=None)


# Product listings use the existing area/full pricing and hair-option rules.
class CatalogItem(db.Model):
    __tablename__ = 'catalog_items'

    catalog_item_id = db.Column(db.Integer, primary_key=True)
    item_name = db.Column(db.String(120), nullable=False)
    name_key = db.Column(db.String(240), nullable=False, unique=True)
    description = db.Column(db.String(2000), nullable=False, default='')
    system_type = db.Column(db.String(10), nullable=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    version = db.Column(db.Integer, nullable=False, default=1)
    created_at = db.Column(db.DateTime, nullable=False, default=utc_now)
    updated_at = db.Column(db.DateTime, nullable=False, default=utc_now)


# Keep the product name used at purchase time, even if its listing changes later.
# This separate table leaves the existing customer-order table unchanged.
class CatalogOrder(db.Model):
    __tablename__ = 'catalog_order_links'

    order_id = db.Column(db.Integer, db.ForeignKey('hairpiece_orders.order_id'), primary_key=True)
    catalog_item_id = db.Column(db.Integer, db.ForeignKey('catalog_items.catalog_item_id'), nullable=False)
    item_name = db.Column(db.String(120), nullable=False)
    order = db.relationship('HairpieceOrder')
