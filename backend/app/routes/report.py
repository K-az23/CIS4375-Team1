from flask import Blueprint, jsonify, request

from ..logic.report import (
    MAX_REPORT_DAYS,
    customer_spending,
    inventory_report,
    sales_by_day,
)
from ..utils.auth import role_required

report_bp = Blueprint("report", __name__)


def _days_arg(default):
    """Return (days, error_response) for the ?days= query string."""
    days = request.args.get("days", default)
    if not days.isdigit() or not 1 <= int(days) <= MAX_REPORT_DAYS:
        return None, (
            jsonify(
                error="Validation failed",
                details={"days": f"Must be a whole number from 1 to {MAX_REPORT_DAYS}"},
            ),
            400,
        )
    return int(days), None


# GET /api/admin/reports/sales?days=7
@report_bp.get("/sales")
@role_required("admin")
def get_sales_report():
    days, error = _days_arg("7")
    if error:
        return error
    return jsonify(sales_by_day(days))


# GET /api/admin/reports/customer-spending
@report_bp.get("/customer-spending")
@role_required("admin")
def get_customer_spending_report():
    return jsonify(customer_spending())


# GET /api/admin/reports/profitability
# Not part of the app: material costs aren't tracked per sale. Kept for reference.
# @report_bp.get("/profitability")
# @role_required("admin")
# def get_profitability_report():
#     return jsonify(error="Profitability report not implemented yet"), 501


# GET /api/admin/reports/inventory?days=30
@report_bp.get("/inventory")
@role_required("admin")
def get_inventory_report():
    days, error = _days_arg("30")
    if error:
        return error
    return jsonify(inventory_report(days))