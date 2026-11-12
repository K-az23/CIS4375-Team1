from datetime import datetime
from decimal import Decimal

import pytest
from app.extensions import db
from app.models import HairpieceOrder

from tests.helpers import auth_header, make_order, make_user, reload

FULL_SPECS = {
    "hair_type": "Straight",
    "base_type": "Skin",
    "skin_type": "Thin (.02mm)",
    "color_code": "#2",
    "grey_percentage": 10,
    "density": "Medium",
    "dimensions": "Full cap, custom",
}


@pytest.fixture
def customer(client):
    return make_user("a@example.com")


@pytest.fixture
def headers(client, customer):
    return auth_header(client, "a@example.com")


def _full_order(user, status="received", price="725", **fields):
    order = make_order(user, price=price, status=status)
    order.order_type = "full"
    for column, value in {**FULL_SPECS, **fields}.items():
        setattr(order, column, value)
    order.placed_at = datetime(2026, 8, 22, 15, 0)
    db.session.commit()
    return order


def test_no_saved_system_yet(client, headers):
    assert client.get(
        "/api/hairpiece-orders/saved-system", headers=headers
    ).get_json() == {"saved_system": None}
    assert (
        client.post("/api/hairpiece-orders/reorder", headers=headers).status_code == 404
    )


def test_saved_system_is_latest_paid_full_system(client, customer, headers):
    _full_order(customer, color_code="#5")
    latest = _full_order(customer, status="ordered", price="800")
    _full_order(customer, status="invoice_sent", color_code="#7")  # unpaid: ignored
    _full_order(customer, status="cancelled", color_code="#7")  # cancelled: ignored
    make_order(customer, status="received")  # area system: not a saved system

    saved = client.get(
        "/api/hairpiece-orders/saved-system", headers=headers
    ).get_json()["saved_system"]

    assert saved["order_id"] == latest.order_id
    assert saved["price"] == 800.0
    assert saved["system_label"] == "Full custom system"
    assert saved["last_ordered"] == "2026-08-22T15:00:00"
    assert saved["specs"] == {
        "hair_type": "Straight",
        "base_type": "Skin",
        "skin_thickness": "Thin (.02mm)",
        "color": "#2",
        "grey_percent": 10,
        "density": "Medium",
        "dimensions": "Full cap, custom",
    }


def test_reorder_copies_specs_and_price(client, customer, headers):
    saved = _full_order(customer, price="725")

    response = client.post("/api/hairpiece-orders/reorder", headers=headers)

    assert response.status_code == 201
    order = response.get_json()["order"]
    assert order["order_id"] != saved.order_id
    assert (order["order_type"], order["price"], order["order_status"]) == (
        "full",
        725.0,
        "invoice_sent",
    )
    assert order["dimensions"] == "Full cap, custom"
    assert order["color_code"] == "#2"
    assert reload(HairpieceOrder, saved.order_id).price == Decimal("725.00")


def test_reorder_twice_is_refused_until_paid(client, customer, headers):
    _full_order(customer)
    assert (
        client.post("/api/hairpiece-orders/reorder", headers=headers).status_code == 201
    )

    second = client.post("/api/hairpiece-orders/reorder", headers=headers)

    assert second.status_code == 409
    assert "waiting for payment" in second.get_json()["error"]


def test_reorder_refuses_options_no_longer_offered(client, customer, headers):
    _full_order(customer, color_code="#12")
    response = client.post("/api/hairpiece-orders/reorder", headers=headers)
    assert response.status_code == 409


def test_saved_system_is_per_customer(client, headers):
    _full_order(make_user("other@example.com"))
    assert client.get(
        "/api/hairpiece-orders/saved-system", headers=headers
    ).get_json() == {"saved_system": None}


def test_requires_login(client):
    assert client.get("/api/hairpiece-orders/saved-system").status_code == 401
    assert client.post("/api/hairpiece-orders/reorder").status_code == 401