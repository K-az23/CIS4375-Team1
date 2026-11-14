from datetime import UTC, datetime
from decimal import Decimal, InvalidOperation

from ..extensions import db
from ..models import InventoryItem, ItemCategory, RestockLog

MAX_SKU_LENGTH = 50
MAX_ITEM_NAME_LENGTH = 100
MAX_BRAND_LENGTH = 100
MAX_MEASUREMENT_LENGTH = 50
MAX_ITEM_TYPE_LENGTH = 20
MAX_UNIT_LENGTH = 50



# validator and standardizer for clean inventory item input
def validate_inventory_data(data, partial=False):
    fields = {}
    errors = {}

    if "category_id" in data or not partial:
        category_id = data.get("category_id")

        if isinstance(category_id, bool) or not isinstance(category_id, int):
            errors["category_id"] = "Category ID is required"
        else:
            category = db.session.get(ItemCategory, category_id)

            if category is None or not category.is_active:
                errors["category_id"] = "Category does not exist or is inactive"
            else:
                fields["category_id"] = category_id

    if "item_name" in data or not partial:
        item_name = data.get("item_name")

        if not isinstance(item_name, str) or not item_name.strip():
            errors["item_name"] = "Item name is required"
        elif len(item_name.strip()) > MAX_ITEM_NAME_LENGTH:
            errors["item_name"] = (
                f"Item name must be {MAX_ITEM_NAME_LENGTH} characters or less"
            )
        else:
            fields["item_name"] = item_name.strip()

    if "sku" in data:
        sku = data.get("sku")

        if sku is None or sku =="":
            fields["sku"] = None
        elif not isinstance(sku, str):
            errors["sku"] = ("SKU must be text")
        elif len(sku.strip()) > MAX_SKU_LENGTH:
            errors["sku"] = (f"SKU must be {MAX_SKU_LENGTH} characters or less")
        else:
            fields["sku"] = sku.strip()

    if "brand" in data:
        brand = data.get("brand")

        if brand is None:
            fields["brand"] = None
        elif not isinstance(brand, str):
            errors["brand"] = "Brand must be text"
        elif len(brand.strip()) > MAX_BRAND_LENGTH:
            errors["brand"] = f"Brand must be {MAX_BRAND_LENGTH} characters or less"
        else: fields["brand"] = brand.strip() or None

    if "measurement" in data:
        measurement = data.get("measurement")

        if measurement is None:
            fields["measurement"] = None
        elif not isinstance(measurement, str):
            errors["measurement"] = "Measurement must be text"
        elif len(measurement.strip()) > MAX_MEASUREMENT_LENGTH:
            errors["measurement"] = (
                f"Measurement must be {MAX_MEASUREMENT_LENGTH} characters or less"
            )
        else:
            fields["measurement"] = measurement.strip() or None

    # An empty optional price clears the value instead of causing an error.
    if "price" in data and data["price"] in (None, ""):
        fields["price"] = None
    elif "price" in data:
        try:
            price = Decimal(str(data.get("price")))

            # Keep the price within the database's money column size.
            if not price.is_finite() or price < 0 or price > Decimal("99999999.99"):
                errors["price"] = "Price must be between 0 and 99999999.99"
            elif price != price.quantize(Decimal("0.01")):
                errors["price"] = "Price can have at most two decimal places"
            else:
                fields["price"] = price
        except (InvalidOperation, TypeError, ValueError):
            errors["price"] = "Price must be a valid number"

    if "item_type" in data:
        item_type = data.get("item_type")

        if item_type is None:
            fields["item_type"] = None
        elif not isinstance(item_type, str):
            errors["item_type"] = "Item type must be text"
        elif len(item_type.strip()) > MAX_ITEM_TYPE_LENGTH:
            errors["item_type"] = ( 
                f"Item type must be {MAX_ITEM_TYPE_LENGTH} characters or less"
            )
        else:
            fields["item_type"] = item_type.strip() or None

    for field in ("quantity_on_hand", "reorder_threshold"):
        if field in data:
            value = data.get(field)

            # True and False are not stock counts, even though Python treats them as numbers.
            if isinstance(value, bool) or not isinstance(value, int) or value < 0 or value > 2147483647:
                errors[field] = f"{field} must be a whole number between 0 and 2147483647"
            else:
                fields[field] = value
    if "unit" in data or not partial:
        unit = data.get("unit")

        if not isinstance(unit, str) or not unit.strip():
            errors["unit"] = "Unit is required"
        elif len(unit.strip()) > MAX_UNIT_LENGTH:
            errors["unit"] = f"Unit must be {MAX_UNIT_LENGTH} characters or less"
        else:
            fields["unit"] = unit.strip()

    if partial and "is_active" in data:
        is_active = data.get("is_active")

        if not isinstance(is_active, bool):
            errors["is_active"] = "is_active must be true or false"
        else:
            fields["is_active"] = is_active
    
    return fields, errors


# a check for whether another inventory item already uses the SKU
def sku_taken(sku, exclude_item_id=None):
    if sku is None:
        return False

    query = db.select(InventoryItem).where(InventoryItem.sku == sku)

    if exclude_item_id is not None:
        query = query.where(InventoryItem.item_id != exclude_item_id)

    return db.session.execute(query).scalar_one_or_none() is not None


# for increasing inventory and record the restock adjustment
def restock_inventory_item(item, quantity):
    if isinstance(quantity, bool) or not isinstance(quantity, int):
        return None, "Quantity must be a whole number"

    if quantity <= 0:
        return None, "Quantity must be greater than 0"

    if not item.is_active:
        return None, "Inactive items cannot be restocked"

    current_quantity = item.quantity_on_hand or 0
    if current_quantity + quantity > 2147483647:
        return None, "The resulting quantity is too large"
    item.quantity_on_hand = current_quantity + quantity

    log = RestockLog(
        item_id = item.item_id,
        event_type="restock",
        quantity_change = quantity,
        logged_at=datetime.now(UTC).replace(tzinfo=None),
    )

    db.session.add(log)

    return log, None

# Reduces inventory by one or for a manual usage adjust
def mark_inventory_item_used(item):
    if not item.is_active:
        return None, "Inactive items cannot be used"

    current_quantity = item.quantity_on_hand or 0

    if current_quantity <= 0:
        return None, "Item is out of stock"

    item.quantity_on_hand = current_quantity - 1

    log = RestockLog(
        item_id=item.item_id,
        event_type="manual_usage",
        quantity_change=-1,
        logged_at=datetime.now(UTC).replace(tzinfo=None),
    )

    db.session.add(log)

    return log, None



# Change stock by a signed amount, such as +2 or -1.
# The route saves the new count and its history entry in the same transaction.
def adjust_inventory_item(item, quantity_change):
    if not item.is_active:
        return None, "Inactive items cannot be adjusted"

    if isinstance(quantity_change, bool) or not isinstance(quantity_change, int):
        return None, "Quantity change must be a whole number"
    if quantity_change == 0:
        return None, "Quantity change cannot be zero"

    new_quantity = (item.quantity_on_hand or 0) + quantity_change
    if new_quantity < 0:
        return None, "This adjustment would make stock negative"
    if new_quantity > 2147483647 or abs(quantity_change) > 2147483647:
        return None, "The quantity change is too large"

    item.quantity_on_hand = new_quantity
    log = RestockLog(
        item_id=item.item_id,
        event_type="manual_adjustment",
        quantity_change=quantity_change,
        logged_at=datetime.now(UTC).replace(tzinfo=None),
    )
    db.session.add(log)
    return log, None
