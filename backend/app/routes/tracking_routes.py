from flask import Blueprint, jsonify


purchasing_bp = Blueprint(
    "purchasing",
    __name__,
    url_prefix="/api/admin/purchasing"
)



# Purchasing tracker schema is not finalized.
# These routes establish the API contract for supplier-order tracking.


# GET /api/admin/purchasing
@purchasing_bp.route("", methods=["GET"])
def get_purchasing_records():
    return jsonify({
        "success": False,
        "message": "Get purchasing records endpoint not implemented yet."
    }), 501

# GET /api/admin/purchasing/<order_id>
@purchasing_bp.route("/<int:order_id>", methods=["GET"])
def get_purchasing_record(order_id):
    return jsonify({
        "success": False,
        "message": "Get purchasing record endpoint not implemented yet."
    }), 501

# POST /api/admin/purchasing
@purchasing_bp.route("", methods=["POST"])
def create_purchasing_record():
    return jsonify({
        "success": False,
        "message": "Create purchasing record endpoint not implemented yet."
    }), 501

# PATCH /api/admin/purchasing/<order_id>
@purchasing_bp.route("/<int:order_id>", methods=["PATCH"])
def update_purchasing_record(order_id):
    return jsonify({
        "success": False,
        "message": "Update purchasing record endpoint not implemented yet."
    }), 501