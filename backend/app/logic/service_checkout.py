from datetime import UTC, datetime, timedelta
from decimal import Decimal, InvalidOperation

from ..extensions import db
from ..models import Appointment, InventoryItem, Payment, RestockLog, UsageLog
from ..models.service_checkout import ServiceCheckout
from ..utils.salon_time import BUSINESS_TIMEZONE, start_of_day_utc


class CheckoutError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def money_value(value, label):
    # Use exact cents instead of rounding floating-point amounts.
    if isinstance(value, bool) or not isinstance(
        value, (str, int, float, Decimal)
    ):
        raise CheckoutError(f"{label} must be a valid amount")

    try:
        amount = Decimal(str(value))

        if not amount.is_finite() or not 0 <= amount <= Decimal("99999999.99"):
            raise CheckoutError(f"{label} is outside the allowed range")

        if amount != amount.quantize(Decimal("0.01")):
            raise CheckoutError(
                f"{label} can have at most two decimal places"
            )
    except InvalidOperation:
        raise CheckoutError(f"{label} must be a valid amount") from None

    return amount


def record_checkout(booking_id, data):
    if not isinstance(data, dict):
        raise CheckoutError("Send a JSON object")

    if data.get("payment_received") is not True:
        raise CheckoutError("Confirm that payment was received in person")

    method = data.get("payment_method")

    if method not in ("cash", "card"):
        raise CheckoutError("Choose cash or card")

    amount = money_value(data.get("amount"), "Amount collected")
    products = data.get("products", [])
    services = data.get("services", [])

    if not isinstance(products, list) or len(products) > 100:
        raise CheckoutError("Choose at most 100 products")

    if not isinstance(services, list) or not 1 <= len(services) <= 100:
        raise CheckoutError("Choose at least one service")

    service_names = []

    for name in services:
        if not isinstance(name, str) or not 1 <= len(name.strip()) <= 100:
            raise CheckoutError(
                "Each service needs a name of at most 100 characters"
            )

        service_names.append(name.strip())

    # Lock the appointment while recording its payment and stock usage.
    appointment = db.session.execute(
        db.select(Appointment)
        .where(Appointment.setmore_booking_id == booking_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    ).scalar_one_or_none()

    if appointment is None:
        raise CheckoutError("Appointment not found", 404)

    if appointment.status != "booked":
        raise CheckoutError("This appointment is already finalized", 409)

    if getattr(appointment, "setmore_missing", False):
        raise CheckoutError(
            "Verify this booking in Setmore before checkout", 409
        )

    if db.session.get(ServiceCheckout, booking_id) is not None:
        raise CheckoutError("This visit already has a receipt", 409)

    previous = db.session.scalar(
        db.select(Payment.payment_id)
        .where(
            Payment.setmore_booking_id == booking_id,
            Payment.payment_type == "service",
            Payment.status.in_(("pending", "succeeded", "refunded")),
        )
        .limit(1)
    )

    if previous is not None:
        raise CheckoutError("This visit already has a service payment", 409)

    # Check every product before changing any stock.
    quantities = {}

    for product in products:
        if not isinstance(product, dict):
            raise CheckoutError("Each product needs an item ID and quantity")

        item_id = product.get("item_id")
        quantity = product.get("quantity")

        if type(item_id) is not int or not 1 <= item_id <= 2147483647:
            raise CheckoutError("Product ID must be a positive whole number")

        if type(quantity) is not int or not 1 <= quantity <= 1000000:
            raise CheckoutError(
                "Product quantity must be a whole number from 1 to 1000000"
            )

        if item_id in quantities:
            raise CheckoutError("Choose each product only once")

        quantities[item_id] = quantity

    snapshots = []
    product_cost = Decimal("0.00")

    for item_id in sorted(quantities):
        item = db.session.execute(
            db.select(InventoryItem)
            .where(InventoryItem.item_id == item_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        ).scalar_one_or_none()

        if item is None or not item.is_active:
            raise CheckoutError("A selected product is missing or inactive")

        if item.item_type == "bulk":
            raise CheckoutError("Bulk items are marked used from Inventory")

        quantity = quantities[item_id]

        if (item.quantity_on_hand or 0) < quantity:
            raise CheckoutError(
                f"Not enough stock for {item.item_name}", 409
            )

        if item.price is None:
            raise CheckoutError(
                f"Enter a unit cost for {item.item_name} in Inventory"
            )

        unit_cost = money_value(item.price, "Product unit cost")
        line_cost = unit_cost * quantity
        product_cost += line_cost

        if product_cost > Decimal("999999999999.99"):
            raise CheckoutError("The total product cost is too large")

        snapshots.append({
            "item_id": item_id,
            "item_name": item.item_name,
            "quantity": quantity,
            "unit": item.unit,
            "unit_cost": str(unit_cost),
            "total_cost": str(line_cost),
        })

    # Only one request can finish this booked visit.
    changed = db.session.execute(
        db.update(Appointment)
        .where(
            Appointment.setmore_booking_id == booking_id,
            Appointment.status == "booked",
        )
        .values(status="completed")
    )

    if changed.rowcount != 1:
        raise CheckoutError("This appointment is already finalized", 409)

    now = datetime.now(UTC).replace(tzinfo=None)

    # Deduct products and keep both inventory and appointment usage records.
    for item_id, quantity in sorted(quantities.items()):
        changed = db.session.execute(
            db.update(InventoryItem)
            .where(
                InventoryItem.item_id == item_id,
                InventoryItem.is_active.is_(True),
                InventoryItem.quantity_on_hand >= quantity,
            )
            .values(
                quantity_on_hand=InventoryItem.quantity_on_hand - quantity
            )
        )

        if changed.rowcount != 1:
            raise CheckoutError(
                "Stock changed. Refresh and try again.", 409
            )

        db.session.add(
            RestockLog(
                item_id=item_id,
                event_type="checkout_usage",
                quantity_change=-quantity,
                logged_at=now,
            )
        )

        db.session.add(
            UsageLog(
                item_id=item_id,
                setmore_booking_id=booking_id,
                quantity_used=quantity,
            )
        )

    # Record money already collected in person. This never charges Stripe.
    payment = Payment(
        setmore_booking_id=booking_id,
        payment_method=method,
        amount=amount,
        payment_type="service",
        status="succeeded",
        charged_at=now,
    )

    db.session.add(payment)
    db.session.flush()

    receipt = ServiceCheckout(
        setmore_booking_id=booking_id,
        payment_id=payment.payment_id,
        product_cost=product_cost,
        products=snapshots,
        services=service_names,
    )

    db.session.add(receipt)

    # Save everything together. The route rolls everything back on failure.
    db.session.commit()

    return appointment, {
        "amount": float(amount),
        "product_cost": float(product_cost),
        "after_product_cost": float(amount - product_cost),
    }


def service_cost_report(days):
    # Report dates follow Houston time. Payment timestamps are stored in UTC.
    today = datetime.now(BUSINESS_TIMEZONE).date()
    start = start_of_day_utc(today - timedelta(days=days - 1))
    end = start_of_day_utc(today + timedelta(days=1))

    rows = db.session.execute(
        db.select(Payment.amount, ServiceCheckout.product_cost)
        .outerjoin(
            ServiceCheckout,
            ServiceCheckout.payment_id == Payment.payment_id,
        )
        .where(
            Payment.payment_type == "service",
            Payment.status == "succeeded",
            Payment.charged_at >= start,
            Payment.charged_at < end,
        )
    ).all()

    sales = sum((row.amount for row in rows), Decimal("0.00"))

    known_cost = sum(
        (
            row.product_cost
            for row in rows
            if row.product_cost is not None
        ),
        Decimal("0.00"),
    )

    # Older payments may not have a cost receipt. Do not pretend that cost is zero.
    missing = sum(row.product_cost is None for row in rows)

    return {
        "days": days,
        "visits": len(rows),
        "service_sales": float(sales),
        "known_product_cost": float(known_cost),
        "missing_cost_visits": missing,
        "after_product_cost": (
            None if missing else float(sales - known_cost)
        ),
    }