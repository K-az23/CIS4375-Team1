from flask import Blueprint, current_app, jsonify, request
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from ..extensions import db
from ..logic.appointment import serialize_appointment
from ..logic.service_checkout import (
    CheckoutError,
    record_checkout,
    service_cost_report,
)
from ..utils.auth import role_required

service_checkout_bp = Blueprint("service_checkout", __name__)


@service_checkout_bp.post("/appointments/<booking_id>/checkout")
@role_required("admin")
def checkout(booking_id):
    try:
        appointment, receipt = record_checkout(
            booking_id,
            request.get_json(silent=True),
        )

        return jsonify(
            appointment=serialize_appointment(appointment),
            receipt=receipt,
        )
    except CheckoutError as error:
        db.session.rollback()
        return jsonify(error=str(error)), error.status
    except IntegrityError:
        db.session.rollback()
        return jsonify(
            error="This checkout conflicts with a saved receipt. "
                  "Refresh before retrying."
        ), 409
    except SQLAlchemyError:
        db.session.rollback()
        current_app.logger.exception("Service checkout could not be saved")

        return jsonify(
            error="Unable to save checkout. Refresh before trying again."
        ), 500


@service_checkout_bp.get("/reports/service-costs")
@role_required("admin")
def get_service_costs():
    days = request.args.get("days", "7")

    if (
        not days.isascii()
        or not days.isdigit()
        or len(days) > 2
        or not 1 <= int(days) <= 90
    ):
        return jsonify(error="Days must be a whole number from 1 to 90"), 400

    return jsonify(service_cost_report(int(days)))