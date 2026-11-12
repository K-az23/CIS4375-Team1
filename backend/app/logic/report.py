from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy import func

from ..extensions import db
from ..models import HairpieceOrder, InventoryItem, Payment, RestockLog, User
from ..utils.salon_time import BUSINESS_TIMEZONE, start_of_day_utc

MAX_REPORT_DAYS = 90

# Refunded and cancelled payments are not revenue.
REVENUE_STATUS = "succeeded"


def sales_by_day(days):
    """Revenue for each of the last `days` days (salon time), oldest first."""
    today = datetime.now(BUSINESS_TIMEZONE).date()
    first_day = today - timedelta(days=days - 1)
    start = start_of_day_utc(first_day)

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
    """Each customer who has paid, with totals, highest spender first."""
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
        .join(HairpieceOrder, HairpieceOrder.user_id == User.user_id)
        .join(Payment, Payment.order_id == HairpieceOrder.order_id)
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

def _is_low_stock(item):
    return (
        item.quantity_on_hand is not None
        and item.reorder_threshold is not None
        and item.quantity_on_hand <= item.reorder_threshold
    )


def inventory_report(days):
    """Stock levels for active items, with what was restocked and used in the
    last `days` days (salon time). Low-stock items come first."""
    today = datetime.now(BUSINESS_TIMEZONE).date()
    start = start_of_day_utc(today - timedelta(days=days - 1))

    movement = db.session.execute(
        db.select(
            RestockLog.item_id,
            RestockLog.event_type,
            func.sum(RestockLog.quantity_change),
        )
        .where(RestockLog.logged_at >= start)
        .group_by(RestockLog.item_id, RestockLog.event_type)
    ).all()

    restocked = {}
    used = {}
    for item_id, event_type, total in movement:
        if event_type == "restock":
            restocked[item_id] = int(total)
        else:
            # Usage is logged as a negative change; report it as a positive count.
            used[item_id] = used.get(item_id, 0) - int(total)

    items = db.session.execute(
        db.select(InventoryItem).where(InventoryItem.is_active.is_(True))
    ).scalars().all()

    rows = [
        {
            "item_id": item.item_id,
            "item_name": item.item_name,
            "unit": item.unit,
            "quantity_on_hand": item.quantity_on_hand,
            "reorder_threshold": item.reorder_threshold,
            "low_stock": _is_low_stock(item),
            "restocked": restocked.get(item.item_id, 0),
            "used": used.get(item.item_id, 0),
        }
        for item in items
    ]
    rows.sort(key=lambda row: (not row["low_stock"], row["item_name"].lower()))

    return {
        "days": days,
        "items": rows,
        "low_stock_count": sum(row["low_stock"] for row in rows),
    }