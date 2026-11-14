from datetime import UTC, datetime, time, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from sqlalchemy import func, or_

from ..extensions import db
from ..models import Appointment, HairpieceOrder, InventoryItem, Payment, RestockLog, Role, User

# The salon is in Houston; "today" and daily totals follow its clock, while the
# database stores UTC.
BUSINESS_TIMEZONE = ZoneInfo("America/Chicago")
MAX_REPORT_DAYS = 90

# Refunded and cancelled payments are not revenue.
REVENUE_STATUS = "succeeded"


def _utc_naive(local_datetime):
    return local_datetime.astimezone(UTC).replace(tzinfo=None)


def sales_by_day(days):
    """Revenue for each of the last `days` days (salon time), oldest first."""
    today = datetime.now(BUSINESS_TIMEZONE).date()
    first_day = today - timedelta(days=days - 1)
    start = _utc_naive(datetime.combine(first_day, time.min, BUSINESS_TIMEZONE))

    payments = db.session.execute(
        db.select(Payment.amount, Payment.charged_at).where(
            Payment.status == REVENUE_STATUS, Payment.charged_at >= start
        )
    ).all()

    totals = {first_day + timedelta(days=i): Decimal(0) for i in range(days)}
    for amount, charged_at in payments:
        local_day = charged_at.replace(tzinfo=UTC).astimezone(BUSINESS_TIMEZONE).date()
        if local_day in totals:
            totals[local_day] += amount

    return {
        "days": [
            {
                "date": day.isoformat(),
                "label": day.strftime("%a"),
                "value": float(total),
                "today": day == today,
            }
            for day, total in totals.items()
        ],
        "total": float(sum(totals.values())),
    }


def customer_spending():
    """Successful order and appointment payments, highest spender first."""
    # Count each payment once. Failed, pending and refunded payments stay out.
    # Inactive customers keep their history; changing account status is not a refund.
    rows = db.session.execute(
        db.select(
            User.user_id,
            User.first_name,
            User.last_name,
            User.email,
            func.sum(Payment.amount).label("total_spent"),
            func.count(Payment.payment_id).label("payment_count"),
            func.max(Payment.charged_at).label("last_payment_at"),
        )
        .select_from(Payment)
        .outerjoin(HairpieceOrder, Payment.order_id == HairpieceOrder.order_id)
        .outerjoin(Appointment, Payment.setmore_booking_id == Appointment.setmore_booking_id)
        .join(User, or_(
            HairpieceOrder.user_id == User.user_id,
            (Payment.order_id.is_(None)) & (Appointment.user_id == User.user_id),
        ))
        .where(Payment.status == REVENUE_STATUS)
        .group_by(User.user_id, User.first_name, User.last_name, User.email)
        .order_by(func.sum(Payment.amount).desc())
    ).all()

    customers = [
        {
            "user_id": row.user_id,
            "first_name": row.first_name,
            "last_name": row.last_name,
            "email": row.email,
            "total_spent": float(row.total_spent),
            "payment_count": row.payment_count,
            "last_payment_at": row.last_payment_at.isoformat()
            if row.last_payment_at
            else None,
        }
        for row in rows
    ]
    total = sum(c["total_spent"] for c in customers)
    return {
        "customers": customers,
        "average_spend": round(total / len(customers), 2) if customers else 0.0,
    }


def inventory_report(days):
    # Show current active stock. Only the movement columns use the chosen dates.
    # Keep the newer FrontTest response names, plus the earlier summary names.
    today = datetime.now(BUSINESS_TIMEZONE).date()
    first_day = today - timedelta(days=days - 1)
    start = _utc_naive(datetime.combine(first_day, time.min, BUSINESS_TIMEZONE))
    end = _utc_naive(datetime.combine(today + timedelta(days=1), time.min, BUSINESS_TIMEZONE))
    movements = db.session.execute(
        db.select(RestockLog).where(RestockLog.logged_at >= start, RestockLog.logged_at < end)
    ).scalars().all()

    restocked = {}
    used = {}
    adjusted = {}
    for log in movements:
        if log.event_type == "restock":
            restocked[log.item_id] = restocked.get(log.item_id, 0) + log.quantity_change
        elif log.event_type in ("manual_usage", "usage", "checkout_usage"):
            used[log.item_id] = used.get(log.item_id, 0) - log.quantity_change
        elif log.event_type == "manual_adjustment":
            adjusted[log.item_id] = adjusted.get(log.item_id, 0) + log.quantity_change
        # Starting stock is not a purchase or usage. Do not count it as either.

    items = db.session.execute(
        db.select(InventoryItem).where(InventoryItem.is_active.is_(True))
    ).scalars().all()
    rows = []
    for item in items:
        low_stock = (
            item.quantity_on_hand is not None and item.reorder_threshold is not None
            and item.quantity_on_hand <= item.reorder_threshold
        )
        rows.append({
            "item_id": item.item_id,
            "item_name": item.item_name,
            "unit": item.unit,
            "quantity_on_hand": item.quantity_on_hand,
            "reorder_threshold": item.reorder_threshold,
            "low_stock": low_stock,
            "restocked": restocked.get(item.item_id, 0),
            "used": used.get(item.item_id, 0),
            "adjusted": adjusted.get(item.item_id, 0),
        })
    rows.sort(key=lambda row: (not row["low_stock"], row["item_name"].lower(), row["item_id"]))
    low_stock_count = sum(row["low_stock"] for row in rows)
    return {
        "days": days,
        "items": rows,
        "low_stock_count": low_stock_count,
        "inventory": {
            "total_items": len(rows), "items_at_reorder_level": low_stock_count,
        },
    }


def membership_report():
    # Membership is currently a yes/no customer flag, not a subscription record.
    # Report the saved flags without inventing renewal dates, fees or revenue.
    customers = db.session.execute(
        db.select(User).join(Role).where(Role.name == "customer")
        .order_by(User.last_name, User.first_name, User.user_id)
    ).scalars().all()
    members = []
    active_customers = 0
    active_members = 0
    inactive_members = 0
    for customer in customers:
        if customer.is_active:
            active_customers += 1
        if customer.is_member:
            members.append({
                "user_id": customer.user_id,
                "first_name": customer.first_name,
                "last_name": customer.last_name,
                "email": customer.email,
                "is_active": customer.is_active,
            })
            if customer.is_active:
                active_members += 1
            else:
                inactive_members += 1
    return {
        "active_customers": active_customers,
        "active_members": active_members,
        "inactive_members": inactive_members,
        "non_members": active_customers - active_members,
        "members": members,
    }
