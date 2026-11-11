from ..extensions import db
from ..models import HairpieceOrder, Role, User
from ..models.hairpiece_order import ORDER_STATUSES
from .catalog import (
    AREA_SYSTEM,
    FULL_SYSTEM,
    SYSTEM_TYPES,
    validate_full_system_price,
    validate_hair_specs,
)
from .payment import cancel_order_payment


class OrderNotAllowed(Exception):
    """Raised when an order can't be changed; carries the HTTP status to return."""

    def __init__(self, message, status):
        super().__init__(message)
        self.status = status


# Which status an admin may move an order to, from which statuses.
# invoice_sent -> pending happens automatically when Stripe confirms payment.
ADMIN_STATUS_CHANGES = {
    "ordered": ("pending",),
    "received": ("ordered",),
    "cancelled": ("invoice_sent", "pending"),
}


def order_dict(order, include_customer=False):
    data = {
        **order.to_dict(),
        "system_label": SYSTEM_TYPES.get(order.order_type, {}).get("label"),
    }
    if include_customer:
        customer = order.user
        data["customer"] = {
            "user_id": customer.user_id,
            "first_name": customer.first_name,
            "last_name": customer.last_name,
            "email": customer.email,
        }
    return data


def build_customer_order(user, data):
    """Return (order, errors) for an area system a customer orders online."""
    columns, errors = validate_hair_specs(data.get("specs"), AREA_SYSTEM)
    if errors:
        return None, errors

    order = HairpieceOrder(
        user_id=user.user_id,
        order_type=AREA_SYSTEM,
        price=SYSTEM_TYPES[AREA_SYSTEM]["price"],
        order_status="invoice_sent",
        **columns,
    )
    return order, {}


def build_invoice(data):
    """Return (order, errors) for an invoice Natasha sends after a consultation."""
    errors = {}

    customer = None
    user_id = data.get("user_id")
    if not isinstance(user_id, int) or isinstance(user_id, bool):
        errors["user_id"] = "Required, must be a number"
    else:
        customer = db.session.execute(
            db.select(User)
            .join(User.role)
            .where(User.user_id == user_id, Role.name == "customer")
        ).scalar_one_or_none()
        if customer is None or not customer.is_active:
            errors["user_id"] = "No active customer with this id"

    system_type = data.get("system_type")
    if system_type not in SYSTEM_TYPES:
        errors["system_type"] = f"Must be one of: {', '.join(SYSTEM_TYPES)}"
        return None, errors

    columns, spec_errors = validate_hair_specs(data.get("specs"), system_type)
    errors.update({f"specs.{field}": msg for field, msg in spec_errors.items()})

    if system_type == FULL_SYSTEM:
        price, price_error = validate_full_system_price(data.get("price"))
        if price_error:
            errors["price"] = price_error
    else:
        # Area systems always cost the catalog price.
        price = SYSTEM_TYPES[AREA_SYSTEM]["price"]

    if errors:
        return None, errors

    order = HairpieceOrder(
        user_id=customer.user_id,
        order_type=system_type,
        price=price,
        order_status="invoice_sent",
        **columns,
    )
    return order, {}


def change_order_status(order, new_status):
    """Move an order to new_status, cancelling any unpaid payment first."""
    if new_status not in ADMIN_STATUS_CHANGES:
        allowed = ", ".join(ADMIN_STATUS_CHANGES)
        raise OrderNotAllowed(f"status must be one of: {allowed}", 400)
    if order.order_status not in ADMIN_STATUS_CHANGES[new_status]:
        raise OrderNotAllowed(
            f"Can't change an order from {order.order_status} to {new_status}", 409
        )

    if new_status == "cancelled":
        # Refuses (409) if the order is paid and not refunded yet.
        cancel_order_payment(order)

    order.order_status = new_status
    db.session.commit()
    return order


def cancel_customer_order(order):
    """Customers may cancel only before they pay."""
    if order.order_status != "invoice_sent":
        raise OrderNotAllowed(
            "Only unpaid orders can be cancelled; contact the salon", 409
        )
    cancel_order_payment(order)
    order.order_status = "cancelled"
    db.session.commit()
    return order


def list_orders(user=None, status=None):
    query = db.select(HairpieceOrder).order_by(HairpieceOrder.order_id.desc())
    if user is not None:
        query = query.where(HairpieceOrder.user_id == user.user_id)
    if status:
        query = query.where(HairpieceOrder.order_status == status)
    return db.session.execute(query).scalars().all()


def validate_status_filter(status):
    if status and status not in ORDER_STATUSES:
        return f"Must be one of: {', '.join(ORDER_STATUSES)}"
    return None