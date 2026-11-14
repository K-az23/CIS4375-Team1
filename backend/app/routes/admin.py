from flask import Blueprint, jsonify, request
from sqlalchemy import and_, or_
from sqlalchemy.exc import SQLAlchemyError

from ..extensions import db
from ..logic.user import (
    get_admin_customers,
    validate_admin_user_update_data,
)
from ..models import Appointment, HairpieceOrder, Payment, User
from ..utils.auth import role_required

admin_user_bp = Blueprint(
    "admin_users",
    __name__,
)


# Return customers with their latest completed visit.
@admin_user_bp.get("")
@role_required("admin")
def list_users():
    customers = get_admin_customers()
    users = []

    for user, last_visit in customers:
        user_data = user.to_admin_dict()

        user_data["last_visit"] = (
            last_visit.isoformat()
            if last_visit is not None
            else None
        )

        users.append(user_data)

    return jsonify(users=users), 200


# Read one customer without changing their account.
@admin_user_bp.get("/<int:user_id>")
@role_required("admin")
def get_user(user_id):
    user = db.session.get(User, user_id)

    if user is None or user.role is None or user.role.name != "customer":
        return jsonify(error="Customer not found"), 404

    return jsonify(user=user.to_admin_dict())


# Keep the existing admin-managed membership and account fields.
@admin_user_bp.patch("/<int:user_id>")
@role_required("admin")
def update_user(user_id):
    user = db.session.get(User, user_id)

    if (
        user is None
        or user.role is None
        or user.role.name not in ("customer", "employee")
    ):
        return jsonify(error="User not found"), 404

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify(error="Request body must be JSON"), 400

    fields, errors = validate_admin_user_update_data(data)

    if errors:
        return jsonify(
            error="Validation failed",
            details=errors,
        ), 400

    if not fields:
        return jsonify(error="No admin editable fields sent"), 400

    for name, value in fields.items():
        setattr(user, name, value)

    try:
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify(error="Unable to update account"), 500

    return jsonify(user=user.to_admin_dict())


# Inactive customers still keep their history.
def find_customer(user_id):
    user = db.session.get(User, user_id)

    if user is None or user.role is None or user.role.name != "customer":
        return None

    return user


def customer_appointments(user_id):
    query = (
        db.select(Appointment)
        .where(Appointment.user_id == user_id)
        .order_by(
            Appointment.appointment_time.desc(),
            Appointment.setmore_booking_id,
        )
    )

    appointments = db.session.execute(query).scalars().all()
    rows = []

    for appointment in appointments:
        row = appointment.to_dict()
        row["service_name"] = (
            appointment.service.service_name
            if appointment.service
            else "Unknown service"
        )
        rows.append(row)

    return rows


def customer_orders(user_id):
    query = (
        db.select(HairpieceOrder)
        .where(HairpieceOrder.user_id == user_id)
        .order_by(
            HairpieceOrder.placed_at.desc(),
            HairpieceOrder.order_id.desc(),
        )
    )

    orders = db.session.execute(query).scalars().all()

    return [order.to_dict() for order in orders]


# Follow the order or appointment to identify who owns a payment.
# If an order link exists, that link decides which customer owns it.
def customer_payments(user_id):
    query = (
        db.select(Payment)
        .outerjoin(Payment.hairpiece_order)
        .outerjoin(Payment.appointment)
        .where(
            or_(
                HairpieceOrder.user_id == user_id,
                and_(
                    Payment.order_id.is_(None),
                    Appointment.user_id == user_id,
                ),
            )
        )
        .order_by(
            Payment.charged_at.desc(),
            Payment.payment_id.desc(),
        )
    )

    payments = db.session.execute(query).scalars().all()

    return [payment.to_dict() for payment in payments]


@admin_user_bp.get("/<int:user_id>/appointments")
@role_required("admin")
def get_admin_user_appointments(user_id):
    if find_customer(user_id) is None:
        return jsonify(error="Customer not found"), 404

    return jsonify(appointments=customer_appointments(user_id))


@admin_user_bp.get("/<int:user_id>/hairpiece-orders")
@role_required("admin")
def get_admin_user_hairpiece_orders(user_id):
    if find_customer(user_id) is None:
        return jsonify(error="Customer not found"), 404

    return jsonify(orders=customer_orders(user_id))


@admin_user_bp.get("/<int:user_id>/payments")
@role_required("admin")
def get_admin_user_payments(user_id):
    if find_customer(user_id) is None:
        return jsonify(error="Customer not found"), 404

    return jsonify(payments=customer_payments(user_id))


# Combine the customer's dated records into one timeline.
# This is a history view, not a log of every account edit.
@admin_user_bp.get("/<int:user_id>/timeline")
@role_required("admin")
def get_admin_user_timeline(user_id):
    customer = find_customer(user_id)

    if customer is None:
        return jsonify(error="Customer not found"), 404

    timeline = [{
        "id": f"account-{customer.user_id}",
        "kind": "Account",
        "description": "Account created",
        "date": (
            customer.created_at.isoformat()
            if customer.created_at
            else None
        ),
        "status": None,
        "amount": None,
    }]

    for appointment in customer_appointments(user_id):
        timeline.append({
            "id": f"appointment-{appointment['setmore_booking_id']}",
            "kind": "Appointment",
            "description": appointment["service_name"],
            "date": appointment["appointment_time"],
            "status": appointment["status"],
            "amount": None,
        })

    for order in customer_orders(user_id):
        timeline.append({
            "id": f"order-{order['order_id']}",
            "kind": "Order",
            "description": f"Hairpiece order #{order['order_id']}",
            "date": order["placed_at"],
            "status": order["order_status"],
            "amount": order["price"],
        })

    for payment in customer_payments(user_id):
        timeline.append({
            "id": f"payment-{payment['payment_id']}",
            "kind": "Payment",
            "description": f"Payment #{payment['payment_id']}",
            "date": payment["charged_at"],
            "status": payment["status"],
            "amount": payment["amount"],
        })

    timeline.sort(
        key=lambda record: record["date"] or "",
        reverse=True,
    )

    return jsonify(timeline=timeline)