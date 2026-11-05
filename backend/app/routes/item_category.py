from flask import Blueprint, jsonify, request
from sqlalchemy.exc import SQLAlchemyError

from ..extensions import db
from ..logic.item_category import(category_name_taken, validate_item_category_data,)
from ..models import ItemCategory
from ..utils.auth import role_required


item_category_bp = Blueprint(
    "item_categories",
    __name__,
)



# GET /api/admin/item-categories
# returns all item categories for admin
@item_category_bp.get("")
@role_required("admin")
def get_item_categories():
    query =  db.select(ItemCategory).order_by(ItemCategory.category_name)

    categories = db.session.execute(query).scalars().all()

    return jsonify(categories=[category.to_dict() for category in categories])


# GET /api/admin/item-categories/<category_id>
# returns one item category
@item_category_bp.get("/<int:category_id>")
@role_required("admin")
def get_item_category(category_id):
    category = db.session.get(ItemCategory, category_id)

    if category is None:
        return jsonify(error="Item category not found"), 404

    return jsonify(category=category.to_dict())


# POST /api/admin/item-categories
# to create a new item category
@item_category_bp.post("")
@role_required("admin")
def create_item_category():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify(error="Request body must be JSON"), 400

    fields, errors = validate_item_category_data(data)

    if errors:
        return jsonify(error="Validation failed", details=errors), 400

    if category_name_taken(fields["category_name"]):
        return jsonify(error="An item category with this name already exists"), 409

    category = ItemCategory(**fields, is_active=True)

    try:
        db.session.add(category)
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify(error="Unable to create item category"), 500

    return jsonify(category=category.to_dict()), 201


# PATCH /api/admin/item-categories/<category_id>
# to update an existing item category
@item_category_bp.patch("/<int:category_id>")
@role_required("admin")
def update_item_category(category_id):
    category = db.session.get(ItemCategory, category_id)

    if category is None:
        return jsonify(error="Item category not found"), 404

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify(error="Request body must be JSON"), 400

    fields, errors = validate_item_category_data(data,partial=True)

    if errors:
        return jsonify(error="Validation failed", details=errors), 400

    if not fields:
        return jsonify(error="No editable fields sent"), 400

    if (
        "category_name" in fields
        and category_name_taken(
            fields["category_name"],
            exclude_category_id=category.category_id,
        )
    ):
        return jsonify(error="An item category with this name already exists"), 409

    for field, value in fields.items():
        setattr(category, field, value)

    try:
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify(error="Unable to update item category"), 500

    return jsonify(category=category.to_dict())


# DELETE /api/admin/item-categories/<category_id>
# delete will be used as a deactivator - so history is not deleted
@item_category_bp.delete("/<int:category_id>")
@role_required("admin")
def deactivate_item_category(category_id):
    category = db.session.get(ItemCategory, category_id)

    if category is None:
        return jsonify(error="Item category not found"), 404

    category.is_active = False

    try:
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify(error="Unable to deactivate item category"), 500

    return jsonify(category=category.to_dict())