from flask import Blueprint, jsonify, request
from sqlalchemy.exc import SQLAlchemyError

from ..extensions import db
from ..logic.inventory import sku_taken, validate_inventory_data
from ..models import InventoryItem
from ..utils.auth import role_required

inventory_bp = Blueprint(
    "inventory",
    __name__,
)



# Admin Inventory Management
# --------------------------


# GET /api/admin/inventory-items
# to return all inventory items 
@inventory_bp.get("")
@role_required("admin")
def get_inventory_items():
    query = db.select(InventoryItem).order_by(InventoryItem.item_name)

    items = db.session.execute(query).scalars().all()

    return jsonify(items=[item.to_dict() for item in items])


# GET /api/admin/inventory-items/low-stock
# to return active inventory items equal to or below thier threshold
@inventory_bp.get("/low-stock")
@role_required("admin")
def get_low_stock_items():
    query = (
        db.select(InventoryItem).where(
            InventoryItem.is_active.is_(True),
            InventoryItem.quantity_on_hand.is_not(None),
            InventoryItem.reorder_threshold.is_not(None),
            InventoryItem.quantity_on_hand <= InventoryItem.reorder_threshold,
        )
        .order_by(InventoryItem.quantity_on_hand)
    )

    items = db.session.execute(query).scalars().all()

    return jsonify(items=[item.to_dict() for item in items])


# GET /api/admin/inventory-items/<item_id>
# returns one inventory item
@inventory_bp.get("/<int:item_id>")
@role_required("admin")
def get_inventory_item(item_id):
    item = db.session.get(InventoryItem, item_id)

    if item is None:
        return jsonify(error="Inventory item not found"), 404

    return jsonify(item=item.to_dict())


# POST /api/admin/inventory-items
# to create a new inventory item
@inventory_bp.post("")
@role_required("admin")
def create_inventory_item():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify(error="Request body must be JSON"), 400

    fields, errors = validate_inventory_data(data)

    if errors:
        return jsonify(error="Validation failed", details=errors), 400

    if sku_taken(fields.get("sku")):
        return jsonify(error="An item with this SKU already exists"), 409

    item = InventoryItem(**fields, is_active=True,)

    try:
        db.session.add(item)
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify(error="Unable to create inventory item"), 500

    return jsonify(item=item.to_dict()), 201


# PATCH /api/admin/inventory-items/<item_id>
# to update an inventory item
@inventory_bp.patch("/<int:item_id>")
@role_required("admin")
def update_inventory_item(item_id):
    item = db.session.get(InventoryItem, item_id)

    if item is None:
        return jsonify(error="Inventory item not found"), 404

    data = request.get_json(siletn=True)

    if not isinstance(data, dict):
        return jsonify(error="Request body must be JSON"), 400

    fields, errors = validate_inventory_data(data, partial=True)

    if errors:
        return jsonify(error="Validation failed", details=errors), 400

    if not fields:
        return jsonify(error="No editable fields sent"), 400

    if(
        "sku" in fields
        and sku_taken(
            fields["sku"],
            exclude_item_id=item.item_id,
        )
    ):
        return jsonify(error="An inventory item with this SKU already exists"), 409

    for field, value in fields.items():
        setattr(item, field, value)

    try:
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify(error="Unable to update inventory item"), 500

    return jsonify(item=item.to_dict())


# DELETE /api/admin/inventory-items/<item_id>
# will deactivate an item -- so history is not deleted
@inventory_bp.delete("/<int:item_id>")
@role_required("admin")
def delete_inventory_item(item_id):
    item = db.session.det(InventoryItem, item_id)

    if item is None:
        return jsonify(error="Inventory item not found"), 404

    item.is_active = False

    try:
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify(error="Unable to deactivate inventory item"), 500

    return jsonify(item=item.to_dict())