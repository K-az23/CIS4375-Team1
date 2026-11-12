from unittest import mock

import stripe
from app.extensions import db
from app.models import Payment

from tests.helpers import auth_header, make_order, make_payment, make_user


def _start(client, headers, order_id):
    return client.post(
        "/api/payments/create-intent", json={"order_id": order_id}, headers=headers
    )


def test_requires_login(client):
    assert (
        client.post("/api/payments/create-intent", json={"order_id": 1}).status_code
        == 401
    )


def test_rejects_bad_order_id(client):
    make_user("a@example.com")
    headers = auth_header(client, "a@example.com")
    for body in (None, {"order_id": "1"}, {"order_id": True}):
        response = client.post(
            "/api/payments/create-intent", json=body, headers=headers
        )
        assert response.status_code == 400


def test_creates_intent_with_price_from_database(client, fake_stripe):
    user = make_user("a@example.com")
    order = make_order(user, price="349.99")
    fake_stripe.v1.customers.create.return_value = mock.Mock(id="cus_1")
    fake_stripe.v1.payment_intents.create.return_value = mock.Mock(
        id="pi_1", client_secret="pi_1_secret_x"
    )

    response = _start(client, auth_header(client, "a@example.com"), order.order_id)

    assert response.status_code == 201
    assert response.get_json() == {"client_secret": "pi_1_secret_x"}
    params = fake_stripe.v1.payment_intents.create.call_args.kwargs["params"]
    assert params["amount"] == 34999
    assert params["currency"] == "usd"
    payment = db.session.execute(db.select(Payment)).scalar_one()
    assert payment.status == "pending"
    assert payment.stripe_payment_intent_id == "pi_1"


def test_second_call_reuses_open_intent(client, fake_stripe):
    user = make_user("a@example.com")
    order = make_order(user)
    make_payment(order, status="pending", intent_id="pi_1")
    fake_stripe.v1.payment_intents.retrieve.return_value = mock.Mock(
        status="requires_payment_method", client_secret="pi_1_secret_x"
    )

    response = _start(client, auth_header(client, "a@example.com"), order.order_id)

    assert response.get_json() == {"client_secret": "pi_1_secret_x"}
    fake_stripe.v1.payment_intents.create.assert_not_called()


def test_other_customers_order_looks_missing(client, fake_stripe):
    owner = make_user("owner@example.com")
    make_user("other@example.com")
    order = make_order(owner)

    response = _start(client, auth_header(client, "other@example.com"), order.order_id)

    assert response.status_code == 404


def test_cancelled_and_paid_orders_are_rejected(client, fake_stripe):
    user = make_user("a@example.com")
    cancelled = make_order(user, status="cancelled")
    paid = make_order(user)
    make_payment(paid, status="succeeded", intent_id="pi_paid")
    headers = auth_header(client, "a@example.com")

    assert _start(client, headers, cancelled.order_id).status_code == 409
    assert _start(client, headers, paid.order_id).status_code == 409


def test_stripe_outage_returns_502(client, fake_stripe):
    user = make_user("a@example.com")
    order = make_order(user)
    fake_stripe.v1.customers.create.side_effect = stripe.APIConnectionError("down")

    response = _start(client, auth_header(client, "a@example.com"), order.order_id)

    assert response.status_code == 502
