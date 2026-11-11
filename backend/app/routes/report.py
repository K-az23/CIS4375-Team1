from flask import Blueprint, jsonify, request

from ..logic.report import MAX_REPORT_DAYS, customer_spending, sales_by_day
from ..utils.auth import role_required

report_bp = Blueprint("report", __name__)


# GET /api/admin/reports/sales?days=7
@report_bp.get("/sales")
@role_required("admin")
def get_sales_report():
    days = request.args.get("days", "7")
    if not days.isdigit() or not 1 <= int(days) <= MAX_REPORT_DAYS:
        return jsonify(
            error="Validation failed",
            details={"days": f"Must be a whole number from 1 to {MAX_REPORT_DAYS}"},
        ), 400
    return jsonify(sales_by_day(int(days)))


# GET /api/admin/reports/customer-spending
@report_bp.get("/customer-spending")
@role_required("admin")
def get_customer_spending_report():
    return jsonify(customer_spending())


# GET /api/admin/reports/profitability
# Needs material costs from inventory usage, which isn't recorded per sale yet.
@report_bp.get("/profitability")
@role_required("admin")
def get_profitability_report():
    return jsonify(error="Profitability report not implemented yet"), 501


# GET /api/admin/reports/inventory
# Low-stock data already comes from GET /api/admin/inventory-items/low-stock.
@report_bp.get("/inventory")
@role_required("admin")
def get_inventory_report():
    return jsonify(error="Inventory report not implemented yet"), 501