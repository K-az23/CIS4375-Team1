from flask import Blueprint, jsonify

item_category_bp = Blueprint(
    "item_categories",
    __name__,
    url_prefix="/api/admin/item-categories"
)



# GET /api/admin/item-categories
@item_category_bp.route("", methods=["GET"])
def get_item_categories():
    return jsonify({
        "success": False,
        "message": "Get item categories endpoint not implemented yet."
    }), 501

# GET /api/admin/item-categories/<category_id>
@item_category_bp.route("/<int:category_id>", methods=["GET"])
def get_item_category(category_id):
    return jsonify({
        "success": False,
        "message": "Get item category endpoint not implemented yet."
    }), 501

# POST /api/admin/item-categories
@item_category_bp.route("", methods=["POST"])
def create_item_category():
    return jsonify({
        "success": False,
        "message": "Create item category endpoint not implemented yet."
    }), 501

# PATCH /api/admin/item-categories/<category_id>
@item_category_bp.route("/<int:category_id>", methods=["PATCH"])
def update_item_category(category_id):
    return jsonify({
        "success": False,
        "message": "Update item category endpoint not implemented yet."
    }), 501

# DELETE /api/admin/item-categories/<category_id>
@item_category_bp.route("/<int:category_id>", methods=["DELETE"])
def delete_item_category(category_id):
    return jsonify({
        "success": False,
        "message": "Delete/deactivate item category endpoint not implemented yet."
    }), 501