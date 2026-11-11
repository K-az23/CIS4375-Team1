from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy.exc import SQLAlchemyError

from ..extensions import db
from ..logic.hairpiece_order import (
    OrderNotAllowed,
    build_customer_order,
    build_invoice,
    build_reorder,
    cancel_customer_order,
    change_order_status,
    latest_full_system,
    list_orders,
    order_dict,
    saved_system_dict,
    validate_status_filter,
)
from ..logic.payment import PaymentError, PaymentNotAllowed
from ..models import HairpieceOrder, User
from ..utils.auth import role_required

hairpiece_order_bp = Blueprint("hairpiece_order", __name__)
admin_hairpiece_order_bp = Blueprint("admin_hairpiece_order", __name__)


def _current_user():
    user = db.session.get(User, int(get_jwt_identity()))
    if user is None or not user.is_active:
        return None
    return user


def _json_body():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else None


def _save(order, status_code):
    try:
        db.session.add(order)
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify(error="Unable to save the order"), 500
    return jsonify(order=order_dict(order, include_customer=True)), status_code


def _apply(change, order):
    """Run a status change and turn its errors into responses."""
    try:
        change(order)
    except (OrderNotAllowed, PaymentNotAllowed) as error:
        db.session.rollback()
        return jsonify(error=str(error)), error.status
    except PaymentError as error:
        db.session.rollback()
        return jsonify(error=str(error)), 502
    return jsonify(order=order_dict(order, include_customer=True))


# POST /api/hairpiece-orders  (customer orders an area system online)
@hairpiece_order_bp.post("")
@jwt_required()
def create_hairpiece_order():
    user = _current_user()
    if user is None:
        return jsonify(error="Account not found or inactive"), 403

    data = _json_body()
    if data is None:
        return jsonify(error="Request body must be a JSON object"), 400

    order, errors = build_customer_order(user, data)
    if errors:
        return jsonify(error="Validation failed", details=errors), 400
    return _save(order, 201)


# GET /api/hairpiece-orders
@hairpiece_order_bp.get("")
@jwt_required()
def get_hairpiece_orders():
    user = _current_user()
    if user is None:
        return jsonify(error="Account not found or inactive"), 403
    return jsonify(orders=[order_dict(o) for o in list_orders(user=user)])


# GET /api/hairpiece-orders/saved-system  (My Hair System page)
@hairpiece_order_bp.get("/saved-system")
@jwt_required()
def get_saved_system():
    user = _current_user()
    if user is None:
        return jsonify(error="Account not found or inactive"), 403

    saved = latest_full_system(user)
    return jsonify(saved_system=saved_system_dict(saved) if saved else None)


# POST /api/hairpiece-orders/reorder  (copies the saved system into a new order)
@hairpiece_order_bp.post("/reorder")
@jwt_required()
def reorder_saved_system():
    user = _current_user()
    if user is None:
        return jsonify(error="Account not found or inactive"), 403

    try:
        order = build_reorder(user)
    except OrderNotAllowed as error:
        return jsonify(error=str(error)), error.status
    return _save(order, 201)


# GET /api/hairpiece-orders/<order_id>
@hairpiece_order_bp.get("/<int:order_id>")
@jwt_required()
def get_hairpiece_order(order_id):
    user = _current_user()
    if user is None:
        return jsonify(error="Account not found or inactive"), 403

    order = db.session.get(HairpieceOrder, order_id)
    # Someone else's order looks the same as a missing one, so ids can't be probed.
    if order is None or order.user_id != user.user_id:
        return jsonify(error="Order not found"), 404
    return jsonify(order=order_dict(order))


# POST /api/hairpiece-orders/<order_id>/cancel
@hairpiece_order_bp.post("/<int:order_id>/cancel")
@jwt_required()
def cancel_hairpiece_order(order_id):
    user = _current_user()
    if user is None:
        return jsonify(error="Account not found or inactive"), 403

    order = db.session.get(HairpieceOrder, order_id)
    if order is None or order.user_id != user.user_id:
        return jsonify(error="Order not found"), 404
    return _apply(cancel_customer_order, order)


# POST /api/admin/hairpiece-orders  (invoice after a consultation)
@admin_hairpiece_order_bp.post("")
@role_required("admin")
def create_invoice():
    data = _json_body()
    if data is None:
        return jsonify(error="Request body must be a JSON object"), 400

    order, errors = build_invoice(data)
    if errors:
        return jsonify(error="Validation failed", details=errors), 400
    return _save(order, 201)


# GET /api/admin/hairpiece-orders?status=pending&user_id=5
@admin_hairpiece_order_bp.get("")
@role_required("admin")
def get_admin_hairpiece_orders():
    status = request.args.get("status")
    error = validate_status_filter(status)
    if error:
        return jsonify(error="Validation failed", details={"status": error}), 400

    user_id = request.args.get("user_id")
    if user_id and not user_id.isdigit():
        return jsonify(
            error="Validation failed", details={"user_id": "Must be a number"}
        ), 400

    orders = list_orders(status=status, user_id=int(user_id) if user_id else None)
    return jsonify(orders=[order_dict(o, include_customer=True) for o in orders])


# PATCH /api/admin/hairpiece-orders/<order_id>/status  body: {"status": "ordered"}
@admin_hairpiece_order_bp.patch("/<int:order_id>/status")
@role_required("admin")
def update_hairpiece_order_status(order_id):
    order = db.session.get(HairpieceOrder, order_id)
    if order is None:
        return jsonify(error="Order not found"), 404

    data = _json_body()
    if data is None:
        return jsonify(error="Request body must be a JSON object"), 400

    new_status = data.get("status")
    return _apply(lambda o: change_order_status(o, new_status), order)