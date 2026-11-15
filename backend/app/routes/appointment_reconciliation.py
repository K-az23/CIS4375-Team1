from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from flask import Blueprint, current_app, jsonify, request
from sqlalchemy.exc import SQLAlchemyError

from ..extensions import db
from ..logic.appointment import (
    get_admin_appointments,
    parse_setmore_time,
    serialize_appointment,
    sync_setmore_appointments,
)
from ..logic.service import sync_services_from_setmore
from ..logic.setmore import SetmoreError, list_appointments
from ..models.appointments import Appointment
from ..utils.auth import role_required

appointment_reconciliation_bp = Blueprint(
    "appointment_reconciliation",
    __name__,
)


def protected(appointment):
    # A sync must not rewrite a finished visit or its financial history.
    return (
        appointment.status != "booked"
        or bool(appointment.payments)
        or bool(appointment.usage_logs)
        or bool(appointment.cancellation_fee_charged)
    )


@appointment_reconciliation_bp.post("/reconcile")
@role_required("admin")
def reconcile():
    try:
        days = int(request.args.get("days", "21"))
        past_days = int(request.args.get("past_days", "30"))
    except ValueError:
        return jsonify(
            error="days and past_days must be whole numbers"
        ), 400

    if not 1 <= days <= 90 or not 0 <= past_days <= 90:
        return jsonify(
            error="Use 1–90 future days and 0–90 past days"
        ), 400

    today = datetime.now(ZoneInfo("America/Chicago")).date()
    start = today - timedelta(days=past_days)
    end = today + timedelta(days=days)

    try:
        # Fetch all pages before making any appointment changes.
        bookings = list_appointments(start, end)
        services = sync_services_from_setmore(dry_run=False)
        seen = {booking["key"] for booking in bookings}

        existing = db.session.scalars(
            db.select(Appointment)
            .where(Appointment.setmore_booking_id.in_(seen))
            .order_by(Appointment.setmore_booking_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        ).all()

        keep = {
            item.setmore_booking_id
            for item in existing
            if protected(item)
        }

        eligible = []
        invalid = []

        for booking in bookings:
            if booking["key"] in keep:
                continue

            try:
                stamp = parse_setmore_time(
                    booking.get("start_time")
                )
            except (TypeError, ValueError):
                stamp = None

            if stamp is None:
                invalid.append(booking["key"])
            elif start <= stamp.date() <= end:
                eligible.append(booking)

        summary = sync_setmore_appointments(
            eligible,
            dry_run=False,
        )
        summary["skipped"].extend(invalid)
        summary["protected"] = len(keep)

        # Missing does not prove cancellation:
        # the booking may have moved to another date.
        missing = [
            serialize_appointment(item)
            for item in get_admin_appointments(
                start_date=start,
                end_date=end,
            )
            if item.setmore_booking_id not in seen
            and not protected(item)
        ]

        return jsonify(
            appointments=summary,
            services=services,
            missing=missing,
        )

    except SetmoreError:
        db.session.rollback()
        return jsonify(
            error="Setmore could not finish the sync. Try again later."
        ), 502

    except SQLAlchemyError:
        db.session.rollback()
        current_app.logger.error(
            "Appointment reconciliation could not be saved"
        )
        return jsonify(
            error="Unable to save the appointment sync"
        ), 500


@appointment_reconciliation_bp.post(
    "/<booking_id>/confirm-cancelled"
)
@role_required("admin")
def confirm_cancelled(booking_id):
    data = request.get_json(silent=True)

    if (
        not isinstance(data, dict)
        or data.get("confirmed_cancelled") is not True
    ):
        return jsonify(
            error="First confirm cancellation in Setmore"
        ), 400

    try:
        item = db.session.get(Appointment, booking_id)

        if item is None:
            return jsonify(error="Appointment not found"), 404

        if protected(item):
            return jsonify(
                error="This visit is finalized or has recorded activity"
            ), 409

        original_time = item.appointment_time

        if data.get("appointment_time") != original_time.isoformat():
            return jsonify(
                error="This booking changed. Sync again before continuing."
            ), 409

        # Finish the read transaction before waiting for Setmore.
        db.session.rollback()

        day = original_time.date()
        bookings = list_appointments(
            day - timedelta(days=1),
            day + timedelta(days=1),
        )

        if any(
            booking["key"] == booking_id
            for booking in bookings
        ):
            return jsonify(
                error=(
                    "This booking is still in Setmore. "
                    "Sync and check it again."
                )
            ), 409

        item = db.session.execute(
            db.select(Appointment)
            .where(
                Appointment.setmore_booking_id == booking_id
            )
            .with_for_update()
            .execution_options(populate_existing=True)
        ).scalar_one_or_none()

        if item is None:
            return jsonify(error="Appointment not found"), 404

        if protected(item) or item.appointment_time != original_time:
            db.session.rollback()
            return jsonify(
                error="This visit changed. Refresh before continuing."
            ), 409

        # Record the owner's verified cancellation locally.
        # This never deletes anything from Setmore,
        # charges a fee, or changes inventory.
        changed = db.session.execute(
            db.update(Appointment)
            .where(
                Appointment.setmore_booking_id == booking_id,
                Appointment.status == "booked",
                Appointment.appointment_time == original_time,
            )
            .values(status="cancelled")
        )

        if changed.rowcount != 1:
            db.session.rollback()
            return jsonify(
                error="This visit changed. Refresh before continuing."
            ), 409

        db.session.commit()
        db.session.refresh(item)

        return jsonify(
            appointment=serialize_appointment(item)
        )

    except SetmoreError:
        db.session.rollback()
        return jsonify(
            error=(
                "Setmore could not verify the booking. "
                "Nothing was cancelled."
            )
        ), 502

    except SQLAlchemyError:
        db.session.rollback()
        current_app.logger.error(
            "Verified appointment cancellation could not be saved"
        )
        return jsonify(
            error=(
                "Unable to record the cancellation. "
                "Refresh before retrying."
            )
        ), 500