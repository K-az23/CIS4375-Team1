from datetime import UTC, datetime, time, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from sqlalchemy import func

from ..extensions import db
from ..models import HairpieceOrder, Payment, User

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