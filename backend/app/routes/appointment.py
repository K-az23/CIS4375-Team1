from datetime import date

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..logic.appointment import (
    complete_appointment,
    get_admin_appointment,
    get_admin_appointments,
    get_user_appointment,
    get_user_appointments,
    mark_appointment_no_show,
    serialize_appointment,
)
from ..utils.auth import role_required

appointment_bp = Blueprint(
    "appointments",
    __name__,
)

admin_appointment_bp = Blueprint(
    "admin_appointments",
    __name__,
)



# Customer Appointments
# ---------------

# GET /api/appointments
@appointment_bp.get("")
@jwt_required()
def get_appointments():
    user_id = int(get_jwt_identity())
    appointments = get_user_appointments(user_id)

    return jsonify(
        appointments = [
            serialize_appointment(appointment)
            for appointment in appointments
        ]
    ), 200

# GET /api/appointments/availability
# May not be used in flow - will be temporarily kept incase
@appointment_bp.route("/availability", methods=["GET"])
def get_appointment_availability():
    return jsonify({
        "success": False,
        "message": "Appointment availability integration not implemented yet."
    }), 501

# POST /api/appointments
# May not be used in flow - will be temporarily kept incase
@appointment_bp.route("", methods=["POST"])
def create_appointment():
    return jsonify({
        "success": False,
        "message": "Create appointment endpoint not implemented yet."
    }), 501

# GET /api/appointments/<setmore_booking_id>
@appointment_bp.get("/<setmore_booking_id>")
@jwt_required()
def get_appointment(setmore_booking_id):
    user_id = int(get_jwt_identity())
    appointment = get_user_appointment(
        user_id=user_id,
        setmore_booking_id=setmore_booking_id
    )

    if appointment is None:
        return jsonify(error="Appointment not found"), 404
    
    return jsonify(
        appointment=serialize_appointment(appointment)
    ), 200

# PATCH /api/appointments/<setmore_booking_id>
# May not be used in flow - will be temporarily kept incase
@appointment_bp.route("/<string:setmore_booking_id>", methods=["PATCH"])
def update_appointment(setmore_booking_id):
    return jsonify({
        "success": False,
        "message": "Update appointment endpoint not implemented yet."
    }), 501

# DELETE /api/appointments/<setmore_booking_id>
# May not be used in flow - will be temporarily kept incase
@appointment_bp.route("/<string:setmore_booking_id>", methods=["DELETE"])
def cancel_appointment(setmore_booking_id):
    return jsonify({
        "success": False,
        "message": "Cancel appointment endpoint not implemented yet."
    }), 501



# Admin Appointments Management
# ---------------


# GET /api/admin/appointments
@admin_appointment_bp.get("")
@role_required("admin")
def admin_get_appointments():
    start = request.args.get("start")
    end = request.args.get("end")

    try:
        start_date = date.fromisoformat(start) if start else None
        end_date = date.fromisoformat(end) if end else None
    except ValueError:
        return jsonify(error="Dates must use YYYY-MM-DD format"), 400

    if start_date and end_date and start_date > end_date:
        return jsonify(error="Start date cannot be after end date"), 400

    appointments = get_admin_appointments(
        start_date=start_date,
        end_date=end_date
    )
    return jsonify(
        appointments=[
            serialize_appointment(appointment)
            for appointment in appointments
        ]
    ), 200


# GET /api/admin/appointments/<setmore_booking_id>
# brings one appointment
@admin_appointment_bp.get("/<setmore_booking_id>")
@role_required("admin")
def admin_get_appointment(setmore_booking_id):
    appointment = get_admin_appointment(setmore_booking_id)

    if appointment is None:
        return jsonify(error="Appointment not found"), 404

    return jsonify(appointment=serialize_appointment(appointment)), 200


# PATCH /api/admin/appointments/<setmore_booking_id>
@admin_appointment_bp.route("/<string:setmore_booking_id>", methods=["PATCH"])
def update_admin_appointment(setmore_booking_id):
    return jsonify({
        "success": False,
        "message": "Admin appointment update endpoint not implemented yet."
    }), 501


# POST /api/admin/appointments/<setmore_booking_id>/no-show
@admin_appointment_bp.post("/<setmore_booking_id>/no-show")
@role_required("admin")
def admin_mark_no_show(setmore_booking_id):
    appointment, result = mark_appointment_no_show(setmore_booking_id)

    if result == "not_found":
        return jsonify(error="Appointment not found"), 404

    if result == "fee_already_charged":
        return jsonify(error="No-show fee has already been charged"), 409

    if result == "already_finalized":
        return jsonify(error="Appointment has already been finalized"), 409

    if result == "no_user":
        return jsonify(error="Appointment is not linked to a website customer"), 409

    if result == "no_stripe_customer":
        return jsonify(error="Customer does not have a Stripe customer account"), 409

    if result == "no_payment_method":
        return jsonify(error="Customer does not have a card on file"), 409

    if result == "stripe_failed":
        return jsonify(error="Unable to process no-show fee"), 502

    return jsonify(
        message="Appointment marked as no-show",
        no_show_fee=result,
        appointment=serialize_appointment(appointment),
    ), 200


# POST /api/admin/appointments/<setmore_booking_id>/complete
@admin_appointment_bp.post("/<setmore_booking_id>/complete")
@role_required("admin")
def admin_complete_appointment(setmore_booking_id):
    appointment, error = complete_appointment(
        setmore_booking_id
    )

    if error == "not_found":
        return jsonify(error="Appointment not found"), 404

    if error == "already_finalized":
        return jsonify(
            error="Appointment has already been finalized"
        ), 409

    return jsonify(
        message="Appointment completed",
        appointment=serialize_appointment(appointment),
    ), 200