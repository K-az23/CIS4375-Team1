from datetime import UTC, datetime, time, timedelta

import pytest
from app.extensions import db
from app.logic.report import BUSINESS_TIMEZONE
from app.models import InventoryItem, ItemCategory, RestockLog

from tests.helpers import auth_header, make_order, make_payment, make_user


@pytest.fixture
def admin_headers(client):
    make_user("admin@example.com", role="admin")
    return auth_header(client, "admin@example.com")


def _utc(local_day, hour):
    """A naive UTC datetime for `hour` o'clock on `local_day` in salon time."""
    local = datetime.combine(local_day, time(hour), BUSINESS_TIMEZONE)
    return local.astimezone(UTC).replace(tzinfo=None)


def test_reports_are_admin_only(client):
    make_user("a@example.com")
    headers = auth_header(client, "a@example.com")
    assert client.get("/api/admin/reports/sales", headers=headers).status_code == 403
    assert client.get("/api/admin/reports/sales").status_code == 401


def test_sales_by_day_counts_only_succeeded_payments(client, admin_headers):
    today = datetime.now(BUSINESS_TIMEZONE).date()
    yesterday = today - timedelta(days=1)
    order = make_order(make_user("c@example.com"))
    make_payment(
        order, status="succeeded", intent_id="pi_1", charged_at=_utc(today, 10)
    )
    make_payment(
        order, status="succeeded", intent_id="pi_2", charged_at=_utc(yesterday, 15)
    )
    make_payment(order, status="refunded", intent_id="pi_3", charged_at=_utc(today, 11))
    make_payment(order, status="pending", intent_id="pi_4")
    # 11pm the day before the window starts: outside a 2-day report.
    make_payment(
        order,
        status="succeeded",
        intent_id="pi_5",
        charged_at=_utc(today - timedelta(days=2), 23),
    )

    data = client.get(
        "/api/admin/reports/sales?days=2", headers=admin_headers
    ).get_json()

    assert [d["date"] for d in data["days"]] == [
        yesterday.isoformat(),
        today.isoformat(),
    ]
    assert [d["today"] for d in data["days"]] == [False, True]
    assert all(d["value"] == 349.99 for d in data["days"])
    assert data["total"] == pytest.approx(699.98)


def test_late_evening_counts_on_the_salon_day(client, admin_headers):
    # 11pm in Houston is the next day in UTC; it must count on the Houston day.
    today = datetime.now(BUSINESS_TIMEZONE).date()
    yesterday = today - timedelta(days=1)
    order = make_order(make_user("c@example.com"))
    make_payment(
        order, status="succeeded", intent_id="pi_1", charged_at=_utc(yesterday, 23)
    )

    days = client.get(
        "/api/admin/reports/sales?days=2", headers=admin_headers
    ).get_json()["days"]

    assert days[0]["value"] == 349.99
    assert days[1]["value"] == 0


def test_sales_days_must_be_valid(client, admin_headers):
    for days in ("0", "91", "abc", "-1"):
        response = client.get(
            f"/api/admin/reports/sales?days={days}", headers=admin_headers
        )
        assert response.status_code == 400


def test_customer_spending_ranks_customers(client, admin_headers):
    big = make_user("big@example.com")
    small = make_user("small@example.com")
    make_user("nothing@example.com")
    big_order = make_order(big)
    make_payment(
        big_order,
        status="succeeded",
        intent_id="pi_1",
        charged_at=datetime(2026, 11, 1),
    )
    make_payment(
        big_order,
        status="succeeded",
        intent_id="pi_2",
        charged_at=datetime(2026, 11, 5),
    )
    make_payment(make_order(small, price="100"), status="succeeded", intent_id="pi_3")
    make_payment(make_order(small, price="900"), status="refunded", intent_id="pi_4")

    data = client.get(
        "/api/admin/reports/customer-spending", headers=admin_headers
    ).get_json()

    assert [c["email"] for c in data["customers"]] == [
        "big@example.com",
        "small@example.com",
    ]
    assert data["customers"][0]["total_spent"] == pytest.approx(699.98)
    assert data["customers"][0]["payment_count"] == 2
    assert data["customers"][0]["last_payment_at"] == "2026-11-05T00:00:00"
    assert data["average_spend"] == pytest.approx(399.99)


def test_profitability_report_is_gone(client, admin_headers):
    response = client.get("/api/admin/reports/profitability", headers=admin_headers)
    assert response.status_code == 404


def _item(name, quantity, threshold, active=True):
    category = db.session.execute(db.select(ItemCategory)).scalars().first()
    if category is None:
        category = ItemCategory(category_name="Adhesives")
        db.session.add(category)
        db.session.flush()
    item = InventoryItem(
        category_id=category.category_id,
        item_name=name,
        unit="bottle",
        quantity_on_hand=quantity,
        reorder_threshold=threshold,
        is_active=active,
    )
    db.session.add(item)
    db.session.commit()
    return item


def _log(item, event_type, change, logged_at):
    db.session.add(
        RestockLog(
            item_id=item.item_id,
            event_type=event_type,
            quantity_change=change,
            logged_at=logged_at,
        )
    )
    db.session.commit()


def test_inventory_report(client, admin_headers):
    today = datetime.now(BUSINESS_TIMEZONE).date()
    tape = _item("Tape", quantity=2, threshold=5)
    glue = _item("Glue", quantity=20, threshold=5)
    _item("Retired", quantity=0, threshold=5, active=False)
    _log(glue, "restock", 10, _utc(today, 9))
    _log(glue, "manual_usage", -1, _utc(today, 10))
    _log(glue, "manual_usage", -1, _utc(today, 11))
    # Outside a 7-day window.
    _log(glue, "restock", 50, _utc(today - timedelta(days=7), 12))

    response = client.get("/api/admin/reports/inventory?days=7", headers=admin_headers)
    assert response.status_code == 200
    data = response.get_json()

    assert data["low_stock_count"] == 1
    # Low stock first; inactive items left out.
    assert [row["item_name"] for row in data["items"]] == ["Tape", "Glue"]
    glue_row = data["items"][1]
    assert glue_row["restocked"] == 10
    assert glue_row["used"] == 2
    assert data["items"][0]["item_id"] == tape.item_id

    bad = client.get("/api/admin/reports/inventory?days=0", headers=admin_headers)
    assert bad.status_code == 400


def test_admin_lists_filter_by_customer(client, admin_headers):
    alice = make_user("alice@example.com")
    bob = make_user("bob@example.com")
    alice_order = make_order(alice)
    make_order(bob)
    make_payment(alice_order, status="succeeded", intent_id="pi_a")
    make_payment(make_order(bob), status="succeeded", intent_id="pi_b")

    orders = client.get(
        f"/api/admin/hairpiece-orders?user_id={alice.user_id}", headers=admin_headers
    ).get_json()["orders"]
    payments = client.get(
        f"/api/admin/payments?user_id={alice.user_id}", headers=admin_headers
    ).get_json()["payments"]

    assert [o["order_id"] for o in orders] == [alice_order.order_id]
    assert [p["customer"]["email"] for p in payments] == ["alice@example.com"]
    assert (
        client.get("/api/admin/payments?user_id=x", headers=admin_headers).status_code
        == 400
    )
    assert (
        client.get(
            "/api/admin/hairpiece-orders?user_id=x", headers=admin_headers
        ).status_code
        == 400
    )