from datetime import datetime
from unittest import mock

import pytest
import stripe
from app.extensions import db
from app.logic.payment import PaymentError, PaymentNotAllowed, cancel_order_payment
from app.models import Payment

from tests.helpers import auth_header, make_order, make_payment, make_user, reload


@pytest.fixture
def admin_headers(client):
    make_user("admin@example.com", role="admin")
    return auth_header(client, "admin@example.com")


def test_customers_cannot_see_admin_list(client):
    make_user("a@example.com")
    headers = auth_header(client, "a@example.com")
    assert client.get("/api/admin/payments", headers=headers).status_code == 403
    assert client.get("/api/admin/payments").status_code == 401


def test_list_includes_customer_and_filters(client, admin_headers):
    order = make_order(make_user("a@example.com"))
    november = make_payment(
        order,
        status="succeeded",
        intent_id="pi_nov",
        charged_at=datetime(2026, 11, 3, 12),
    )
    make_payment(
        order,
        status="succeeded",
        intent_id="pi_oct",
        charged_at=datetime(2026, 10, 15, 12),
    )
    make_payment(order, status="failed", intent_id="pi_failed")

    everything = client.get("/api/admin/payments", headers=admin_headers).get_json()[
        "payments"
    ]
    assert len(everything) == 3
    assert everything[0]["customer"]["email"] == "a@example.com"

    succeeded = client.get(
        "/api/admin/payments?status=succeeded", headers=admin_headers
    )
    assert len(succeeded.get_json()["payments"]) == 2

    in_november = client.get(
        "/api/admin/payments?from=2026-11-01&to=2026-11-30", headers=admin_headers
    ).get_json()["payments"]
    assert [p["payment_id"] for p in in_november] == [november.payment_id]


def test_invalid_filters_return_400(client, admin_headers):
    for query in ("?status=paid", "?from=11/03/2026", "?from=2026-12-01&to=2026-11-01"):
        response = client.get(f"/api/admin/payments{query}", headers=admin_headers)
        assert response.status_code == 400


def test_refund_marks_refunded_once(client, admin_headers, fake_stripe):
    payment = make_payment(
        make_order(make_user("a@example.com")), status="succeeded", intent_id="pi_1"
    )
    fake_stripe.v1.refunds.create.return_value = mock.Mock(status="succeeded")
    url = f"/api/admin/payments/{payment.payment_id}/refund"

    response = client.post(url, headers=admin_headers)

    assert response.status_code == 200
    assert response.get_json()["payment"]["status"] == "refunded"
    options = fake_stripe.v1.refunds.create.call_args.kwargs["options"]
    assert options["idempotency_key"] == f"refund-payment-{payment.payment_id}"
    assert client.post(url, headers=admin_headers).status_code == 409


def test_refund_rejects_unpaid_and_cash(client, admin_headers, fake_stripe):
    order = make_order(make_user("a@example.com"))
    pending = make_payment(order, status="pending", intent_id="pi_pending")
    cash = make_payment(
        order, status="succeeded", intent_id=None, payment_method="cash"
    )

    for payment in (pending, cash):
        url = f"/api/admin/payments/{payment.payment_id}/refund"
        assert client.post(url, headers=admin_headers).status_code == 409
    fake_stripe.v1.refunds.create.assert_not_called()


def test_cancel_stops_unpaid_payment(app, fake_stripe):
    order = make_order(make_user("a@example.com"))
    payment = make_payment(order, status="pending", intent_id="pi_1")
    fake_stripe.v1.payment_intents.retrieve.return_value = mock.Mock(
        status="requires_payment_method"
    )

    cancel_order_payment(order)

    fake_stripe.v1.payment_intents.cancel.assert_called_once_with("pi_1")
    assert reload(Payment, payment.payment_id).status == "cancelled"


def test_cancel_refuses_paid_order(app, fake_stripe):
    order = make_order(make_user("a@example.com"))
    make_payment(order, status="succeeded", intent_id="pi_1")

    with pytest.raises(PaymentNotAllowed):
        cancel_order_payment(order)
    fake_stripe.v1.payment_intents.cancel.assert_not_called()


def test_cancel_reports_stripe_outage(app, fake_stripe):
    order = make_order(make_user("a@example.com"))
    make_payment(order, status="pending", intent_id="pi_1")
    fake_stripe.v1.payment_intents.retrieve.side_effect = stripe.APIConnectionError(
        "down"
    )

    with pytest.raises(PaymentError):
        cancel_order_payment(order)
    db.session.rollback()
