from flask import Blueprint, jsonify, request


report_bp = Blueprint(
    "reports",
    __name__,
    url_prefix="/api/admin/reports"
)


# Admin Reports
# -------------


# GET /api/admin/reports/profitability
@report_bp.route("/profitability", methods=["GET"])
def get_profitability_report():
    start_date = request.args.get("startDate")
    end_date = request.args.get("endDate")
    export_format = request.args.get("format")

    return jsonify({
        "success": False,
        "message": "Profitability report endpoint not implemented yet."
    }), 501

# GET /api/admin/reports/inventory
@report_bp.route("/inventory", methods=["GET"])
def get_inventory_report():
    export_format = request.args.get("format")

    return jsonify({
        "success": False,
        "message": "Inventory report endpoint not implemented yet."
    }), 501

# GET /api/admin/reports/sales
@report_bp.route("/sales", methods=["GET"])
def get_sales_report():
    start_date = request.args.get("startDate")
    end_date = request.args.get("endDate")
    export_format = request.args.get("format")

    return jsonify({
        "success": False,
        "message": "Sales report endpoint not implemented yet."
    }), 501

# GET /api/admin/reports/customer-spending
@report_bp.route("/customer-spending", methods=["GET"])
def get_customer_spending_report():
    start_date = request.args.get("startDate")
    end_date = request.args.get("endDate")
    export_format = request.args.get("format")

    return jsonify({
        "success": False,
        "message": "Customer spending report endpoint not implemented yet."
    }), 501