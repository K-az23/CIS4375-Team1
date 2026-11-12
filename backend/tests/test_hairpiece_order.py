from unittest import mock

import pytest

from app.models import HairpieceOrder, Payment
from tests.helpers import (
    auth_header,
    make_order,
    make_payment,
    make_user,
    reload,
    send_webhook,
)

AREA_SPECS = {
    "hair_type": "Wavy",
    "base_type": "Skin",
    "skin_thickness": "Thin (.02mm)",
    "color": "#3",
    "grey_percent": 20,
    "density": "Medium",
    "dimensions": "7 x 9",
}


@pytest.fixture
def customer_headers(client):
    make_user("a@example.com")
    return auth_header(client, "a@example.com")


@pytest.fixture
def admin_headers(client):
    make_user("admin@example.com", role="admin")
    return auth_header(client, "admin@example.com")


def test_customer_orders_area_system_at_catalog_price(client, customer_headers):
    response = client.post(
        "/api/hairpiece-orders",
        json={"specs": AREA_SPECS, "price": 1},
        headers=customer_headers,
    )

    assert response.status_code == 201
    order = response.get_json()["order"]
    assert order["order_type"] == "area"
    assert order["price"] == 400.0
    assert order["order_status"] == "invoice_sent"
    assert order["skin_type"] == "Thin (.02mm)"
    assert order["grey_percentage"] == 20
    assert order["hair_type"] == "Wavy"


def test_invalid_specs_are_rejected(client, customer_headers):
    bad = {**AREA_SPECS, "color": "#9", "grey_percent": True, "dimensions": "9 x 9"}
    response = client.post(
        "/api/hairpiece-orders", json={"specs": bad}, headers=customer_headers
    )
    assert response.status_code == 400
    assert set(response.get_json()["details"]) == {
        "color",
        "grey_percent",
        "dimensions",
    }
    assert (
        client.post(
            "/api/hairpiece-orders", json={}, headers=customer_headers
        ).status_code
        == 400
    )


def test_customer_sees_only_own_orders(client, customer_headers):
    mine = make_order(make_user("x@example.com"))
    response = client.get("/api/hairpiece-orders", headers=customer_headers)
    assert response.get_json() == {"orders": []}
    assert (
        client.get(
            f"/api/hairpiece-orders/{mine.order_id}", headers=customer_headers
        ).status_code
        == 404
    )


def test_admin_invoices_full_system_with_minimum_price(client, admin_headers):
    customer = make_user("c@example.com")
    body = {
        "user_id": customer.user_id,
        "system_type": "full",
        "specs": {**AREA_SPECS, "dimensions": "Full cap, custom"},
        "price": 725,
    }
    response = client.post(
        "/api/admin/hairpiece-orders", json=body, headers=admin_headers
    )
    assert response.status_code == 201
    order = response.get_json()["order"]
    assert (order["order_type"], order["price"], order["dimensions"]) == (
        "full",
        725.0,
        "Full cap, custom",
    )
    assert order["customer"]["email"] == "c@example.com"

    too_low = client.post(
        "/api/admin/hairpiece-orders",
        json={**body, "price": 500},
        headers=admin_headers,
    )
    assert too_low.status_code == 400
    assert "price" in too_low.get_json()["details"]


def test_admin_area_invoice_ignores_price(client, admin_headers):
    customer = make_user("c@example.com")
    body = {
        "user_id": customer.user_id,
        "system_type": "area",
        "specs": AREA_SPECS,
        "price": 5,
    }
    order = client.post(
        "/api/admin/hairpiece-orders", json=body, headers=admin_headers
    ).get_json()["order"]
    assert order["price"] == 400.0


def test_invoice_needs_an_active_customer(client, admin_headers):
    body = {"user_id": 999, "system_type": "area", "specs": AREA_SPECS}
    response = client.post(
        "/api/admin/hairpiece-orders", json=body, headers=admin_headers
    )
    assert response.status_code == 400
    assert "user_id" in response.get_json()["details"]


def test_customers_cannot_use_admin_routes(client, customer_headers):
    assert (
        client.get("/api/admin/hairpiece-orders", headers=customer_headers).status_code
        == 403
    )
    assert (
        client.post(
            "/api/admin/hairpiece-orders", json={}, headers=customer_headers
        ).status_code
        == 403
    )


def test_payment_moves_order_to_pending_then_admin_moves_it_on(client, admin_headers):
    order = make_order(make_user("c@example.com"))
    make_payment(order, status="pending", intent_id="pi_1")

    send_webhook(
        client, "payment_intent.succeeded", {"id": "pi_1", "object": "payment_intent"}
    )
    assert reload(HairpieceOrder, order.order_id).order_status == "pending"

    url = f"/api/admin/hairpiece-orders/{order.order_id}/status"
    assert (
        client.patch(
            url, json={"status": "received"}, headers=admin_headers
        ).status_code
        == 409
    )
    assert (
        client.patch(url, json={"status": "ordered"}, headers=admin_headers).get_json()[
            "order"
        ]["order_status"]
        == "ordered"
    )
    assert (
        client.patch(
            url, json={"status": "received"}, headers=admin_headers
        ).get_json()["order"]["order_status"]
        == "received"
    )
    assert (
        client.patch(url, json={"status": "shipped"}, headers=admin_headers).status_code
        == 400
    )


def test_admin_filter_by_status(client, admin_headers):
    customer = make_user("c@example.com")
    make_order(customer)
    make_order(customer, status="pending")
    response = client.get(
        "/api/admin/hairpiece-orders?status=pending", headers=admin_headers
    )
    assert [o["order_status"] for o in response.get_json()["orders"]] == ["pending"]
    assert (
        client.get(
            "/api/admin/hairpiece-orders?status=paid", headers=admin_headers
        ).status_code
        == 400
    )


def test_customer_cancel_unpaid_order_cancels_stripe_payment(
    client, customer_headers, fake_stripe
):
    order = client.post(
        "/api/hairpiece-orders", json={"specs": AREA_SPECS}, headers=customer_headers
    ).get_json()["order"]
    payment = make_payment(reload(HairpieceOrder, order["order_id"]), intent_id="pi_9")
    fake_stripe.v1.payment_intents.retrieve.return_value = mock.Mock(
        status="requires_payment_method"
    )

    response = client.post(
        f"/api/hairpiece-orders/{order['order_id']}/cancel", headers=customer_headers
    )

    assert response.get_json()["order"]["order_status"] == "cancelled"
    assert reload(Payment, payment.payment_id).status == "cancelled"
    fake_stripe.v1.payment_intents.cancel.assert_called_once_with("pi_9")


def test_customer_cannot_cancel_paid_order(client, customer_headers):
    order = client.post(
        "/api/hairpiece-orders", json={"specs": AREA_SPECS}, headers=customer_headers
    ).get_json()["order"]
    paid = reload(HairpieceOrder, order["order_id"])
    paid.order_status = "pending"
    response = client.post(
        f"/api/hairpiece-orders/{order['order_id']}/cancel", headers=customer_headers
    )
    assert response.status_code == 409


def test_admin_cannot_cancel_paid_order_until_refunded(client, admin_headers):
    order = make_order(make_user("c@example.com"), status="pending")
    payment = make_payment(order, status="succeeded", intent_id="pi_1")
    url = f"/api/admin/hairpiece-orders/{order.order_id}/status"

    assert (
        client.patch(
            url, json={"status": "cancelled"}, headers=admin_headers
        ).status_code
        == 409
    )
    assert reload(HairpieceOrder, order.order_id).order_status == "pending"

    reload(Payment, payment.payment_id).status = "refunded"
    assert (
        client.patch(
            url, json={"status": "cancelled"}, headers=admin_headers
        ).status_code
        == 200
    )


def test_cannot_pay_order_that_is_not_waiting_for_payment(client, customer_headers):
    order = client.post(
        "/api/hairpiece-orders", json={"specs": AREA_SPECS}, headers=customer_headers
    ).get_json()["order"]
    reload(HairpieceOrder, order["order_id"]).order_status = "ordered"
    response = client.post(
        "/api/payments/create-intent",
        json={"order_id": order["order_id"]},
        headers=customer_headers,
    )
    assert response.status_code == 409