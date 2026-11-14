from datetime import date, datetime, timedelta
from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy.exc import SQLAlchemyError

from ..extensions import db
from ..models import Appointment, HairpieceOrder, User
from ..models.order_appointment import OrderAppointment
from ..logic.appointment import (
    SALON_TIMEZONE, finalize_appointment, get_admin_appointments,
    get_user_appointments, serialize_appointment, sync_from_setmore, utc_now,
)
from ..logic.setmore import SetmoreError
from ..utils.auth import role_required

appointment_bp = Blueprint('appointments', __name__)
admin_appointment_bp = Blueprint('admin_appointments', __name__)
order_appointment_bp = Blueprint('order_appointments', __name__)


def current_user():
    user = db.session.get(User, int(get_jwt_identity()))
    return user if user and user.is_active else None


@appointment_bp.get('/booking-info')
@jwt_required()
def booking_info():
    if current_user() is None:
        return jsonify(error='Account not found or inactive'), 403
    return jsonify(booking_url=current_app.config.get('SETMORE_BOOKING_URL') or 'https://theexecutiveparlor.setmore.com')


@appointment_bp.get('')
@jwt_required()
def customer_list():
    user = current_user()
    if user is None:
        return jsonify(error='Account not found or inactive'), 403
    return jsonify(appointments=[serialize_appointment(item) for item in get_user_appointments(user.user_id)])


@appointment_bp.get('/<booking_id>')
@jwt_required()
def customer_details(booking_id):
    user = current_user()
    if user is None:
        return jsonify(error='Account not found or inactive'), 403
    item = db.session.get(Appointment, booking_id)
    if item is None or item.user_id != user.user_id:
        return jsonify(error='Appointment not found'), 404
    return jsonify(appointment=serialize_appointment(item))


def date_args():
    try:
        start = date.fromisoformat(request.args['start']) if request.args.get('start') else None
        end = date.fromisoformat(request.args['end']) if request.args.get('end') else None
    except ValueError:
        return None, None, 'Dates must use YYYY-MM-DD format'
    if start and end and start > end:
        return None, None, 'Start date cannot be after end date'
    return start, end, None


@admin_appointment_bp.get('')
@role_required('admin')
def admin_list():
    start, end, error = date_args()
    if error:
        return jsonify(error=error), 400
    user_id = request.args.get('user_id')
    if user_id and (len(user_id) > 10 or not user_id.isascii() or not user_id.isdigit() or not 1 <= int(user_id) <= 2147483647):
        return jsonify(error='Customer ID must be a positive whole number'), 400
    items = get_admin_appointments(start, end, int(user_id) if user_id else None)
    return jsonify(appointments=[serialize_appointment(item, admin=True) for item in items])


@admin_appointment_bp.get('/<booking_id>')
@role_required('admin')
def admin_details(booking_id):
    item = db.session.get(Appointment, booking_id)
    if item is None:
        return jsonify(error='Appointment not found'), 404
    return jsonify(appointment=serialize_appointment(item, admin=True))


def finish(booking_id, status, confirmed=False):
    try:
        item, error, code = finalize_appointment(booking_id, status, confirmed)
        if error:
            db.session.rollback()
            return jsonify(error=error), code
        return jsonify(appointment=serialize_appointment(item, admin=True))
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify(error='Unable to update the appointment'), 500


@admin_appointment_bp.post('/<booking_id>/complete')
@role_required('admin')
def complete(booking_id):
    return finish(booking_id, 'completed')


@admin_appointment_bp.post('/<booking_id>/no-show')
@role_required('admin')
def no_show(booking_id):
    return finish(booking_id, 'no_show')


@admin_appointment_bp.patch('/<booking_id>')
@role_required('admin')
def admin_update(booking_id):
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(error='Request body must be a JSON object'), 400
    return finish(booking_id, data.get('status'), data.get('confirmed_in_setmore') is True)


@admin_appointment_bp.post('/sync')
@role_required('admin')
def sync():
    days = request.args.get('days', '14')
    past = request.args.get('past_days', '30')
    for value in (days, past):
        if len(value) > 2 or not value.isascii() or not value.isdigit() or not 1 <= int(value) <= 90:
            return jsonify(error='days and past_days must be whole numbers from 1 to 90'), 400
    today = datetime.now(SALON_TIMEZONE).date()
    start = today - timedelta(days=int(past))
    end = today + timedelta(days=int(days))
    try:
        result = sync_from_setmore(start, end)
        return jsonify(result)
    except SetmoreError:
        db.session.rollback()
        return jsonify(error='Unable to sync Setmore. Check the connection and try again.'), 503
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify(error='Unable to save the Setmore sync'), 500


def accessible_order(order_id, lock=False):
    user = current_user()
    if user is None:
        return None, 403
    query = db.select(HairpieceOrder).where(HairpieceOrder.order_id == order_id)
    if lock:
        query = query.with_for_update()
    order = db.session.execute(query).scalar_one_or_none()
    admin = user.role and user.role.name == 'admin'
    if order is None or (not admin and order.user_id != user.user_id):
        return None, 404
    return order, None


@order_appointment_bp.get('/<int:order_id>/appointment')
@jwt_required()
def order_link(order_id):
    order, error = accessible_order(order_id)
    if error:
        return jsonify(error='Order not found or account inactive'), error
    link = db.session.get(OrderAppointment, order_id)
    if link is None:
        return jsonify(appointment=None)
    item = db.session.get(Appointment, link.setmore_booking_id)
    if item is None or item.user_id != order.user_id:
        return jsonify(error='The appointment no longer matches this customer. Contact the salon.'), 409
    return jsonify(appointment=serialize_appointment(item))


@order_appointment_bp.post('/<int:order_id>/appointment')
@jwt_required()
def link_order(order_id):
    order, error = accessible_order(order_id, lock=True)
    if error:
        return jsonify(error='Order not found or account inactive'), error
    data = request.get_json(silent=True)
    booking_id = data.get('setmore_booking_id') if isinstance(data, dict) else None
    if not isinstance(booking_id, str) or not 1 <= len(booking_id) <= 100:
        return jsonify(error='Select an appointment'), 400
    item = db.session.get(Appointment, booking_id)
    if item is None or item.user_id != order.user_id:
        return jsonify(error='Matching customer appointment not found'), 404
    if order.order_status != 'received':
        return jsonify(error='The order must be received before linking its appointment'), 409
    link = db.session.get(OrderAppointment, order_id)
    if link and link.setmore_booking_id == booking_id:
        return jsonify(appointment=serialize_appointment(item))
    if item.status != 'booked' or item.setmore_missing or item.appointment_time <= utc_now():
        return jsonify(error='Choose a future confirmed booking'), 409
    if link:
        old = db.session.get(Appointment, link.setmore_booking_id)
        if old and old.status != 'cancelled':
            return jsonify(error='This order already has an appointment. Reschedule it in Setmore.'), 409
        link.setmore_booking_id = booking_id
        link.linked_at = utc_now()
    else:
        db.session.add(OrderAppointment(order_id=order_id, setmore_booking_id=booking_id))
    try:
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify(error='Unable to link the appointment'), 500
    return jsonify(appointment=serialize_appointment(item))
