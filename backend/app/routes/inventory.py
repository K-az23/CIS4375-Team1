from datetime import UTC, datetime

from flask import Blueprint, jsonify, request
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from ..extensions import db
from ..logic.inventory import (
    adjust_inventory_item,
    mark_inventory_item_used,
    restock_inventory_item,
    sku_taken,
    validate_inventory_data,
)
from ..models import InventoryItem, RestockLog, UsageLog
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

    fields.setdefault("quantity_on_hand", 0)
    fields.setdefault("reorder_threshold", 0)
    item = InventoryItem(**fields, is_active=True,)

    try:
        db.session.add(item)
        db.session.flush()
        # Include the starting stock so the new item's history has an opening balance.
        if item.quantity_on_hand > 0:
            log = RestockLog(
                item_id=item.item_id,
                event_type="starting_stock",
                quantity_change=item.quantity_on_hand,
                logged_at=datetime.now(UTC).replace(tzinfo=None),
            )
            db.session.add(log)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify(error="The SKU is already used, or the category changed. Check the item and try again."), 409
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

    data = request.get_json(silent=True)

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

    # Keep the existing PATCH behavior for other callers. If PATCH changes
    # the stock count, record that difference in history as well.
    previous_quantity = item.quantity_on_hand or 0
    for field, value in fields.items():
        setattr(item, field, value)

    if "quantity_on_hand" in fields:
        quantity_change = item.quantity_on_hand - previous_quantity
        if quantity_change != 0:
            log = RestockLog(
                item_id=item.item_id,
                event_type="manual_adjustment",
                quantity_change=quantity_change,
                logged_at=datetime.now(UTC).replace(tzinfo=None),
            )
            db.session.add(log)

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify(error="The SKU is already used, or the category changed. Check the item and try again."), 409
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify(error="Unable to update inventory item"), 500

    return jsonify(item=item.to_dict())


# DELETE /api/admin/inventory-items/<item_id>
# will deactivate an item -- so history is not deleted
@inventory_bp.delete("/<int:item_id>")
@role_required("admin")
def delete_inventory_item(item_id):
    item = db.session.get(InventoryItem, item_id)

    if item is None:
        return jsonify(error="Inventory item not found"), 404

    item.is_active = False

    try:
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify(error="Unable to deactivate inventory item"), 500

    return jsonify(item=item.to_dict())


# POST
# to add a received quantitty to an inventory item
@inventory_bp.post("/<int:item_id>/restock")
@role_required("admin")
def restock_inventory(item_id):
    item = db.session.get(InventoryItem, item_id)

    if item is None:
        return jsonify(error="Inventory item not found"), 404

    data = request.get_json(silent = True)

    if not isinstance(data, dict):
        return jsonify(error="JSON body is required"), 400

    quantity = data.get("quantity")

    log, error = restock_inventory_item(item, quantity)

    if error:
        return jsonify(error=error), 400

    try:
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify(error="Unable to restock inventory item"), 500

    return jsonify(
        message="Inventory item restocked",
        item=item.to_dict(),
        adjustment=log.to_dict(),
    ), 200


# POST
# For mannually subtracting one item from inventory
@inventory_bp.post("/<int:item_id>/use")
@role_required("admin")
def use_inventory_item(item_id):
    item = db.session.get(InventoryItem, item_id)

    if item is None:
        return jsonify(error="Inventory item not found"), 404

    log, error = mark_inventory_item_used(item)

    if error:
        return jsonify(error=error), 400

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify(error="The SKU is already used, or the category changed. Check the item and try again."), 409
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify(error="Unable to update inventory item"), 500

    return jsonify(
        message="One inventory item marked used",
        item=item.to_dict(),
        adjustment=log.to_dict(),
    ), 200

# INV-07: save a stock correction and record how much the quantity changed.
@inventory_bp.post("/<int:item_id>/adjustments")
@role_required("admin")
def create_inventory_adjustment(item_id):
    item = db.session.get(InventoryItem, item_id)
    if item is None:
        return jsonify(error="Inventory item not found"), 404

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(error="Request body must be JSON"), 400

    log, error = adjust_inventory_item(item, data.get("quantity_change"))
    if error:
        return jsonify(error=error), 400

    try:
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify(error="Unable to save stock adjustment"), 500

    return jsonify(item=item.to_dict(), adjustment=log.to_dict()), 201


# INV-08: combine manual changes and appointment usage into one history list.
# These are the existing history tables. No new database columns are needed.
@inventory_bp.get("/<int:item_id>/transactions")
@role_required("admin")
def get_inventory_transactions(item_id):
    item = db.session.get(InventoryItem, item_id)
    if item is None:
        return jsonify(error="Inventory item not found"), 404

    transactions = []
    stock_query = db.select(RestockLog).where(RestockLog.item_id == item_id)
    stock_logs = db.session.execute(stock_query).scalars().all()
    for log in stock_logs:
        transactions.append({
            "id": f"stock-{log.restock_log_id}",
            "event_type": log.event_type,
            "quantity_change": log.quantity_change,
            "logged_at": log.to_dict()["logged_at"],
            "appointment_id": None,
        })

    usage_query = db.select(UsageLog).where(UsageLog.item_id == item_id)
    usage_logs = db.session.execute(usage_query).scalars().all()
    for log in usage_logs:
        transactions.append({
            "id": f"usage-{log.usage_log_id}",
            "event_type": "appointment_usage",
            "quantity_change": -log.quantity_used,
            # The usage table has no date column. Show a blank date instead of guessing.
            "logged_at": None,
            "appointment_id": log.setmore_booking_id,
        })

    transactions.sort(key=lambda row: row["logged_at"] or "", reverse=True)
    return jsonify(transactions=transactions)
