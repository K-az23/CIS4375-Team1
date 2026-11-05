from datetime import datetime

from tests.helpers import auth_header, make_order, make_payment, make_user


def test_customer_sees_only_own_payments(client):
    alice = make_user("alice@example.com")
    bob = make_user("bob@example.com")
    mine = make_payment(make_order(alice), status="succeeded", intent_id="pi_a")
    make_payment(make_order(bob), status="succeeded", intent_id="pi_b")

    response = client.get(
        "/api/payments", headers=auth_header(client, "alice@example.com")
    )

    payments = response.get_json()["payments"]
    assert [p["payment_id"] for p in payments] == [mine.payment_id]
    assert "stripe_payment_intent_id" not in payments[0]


def test_one_payment_and_someone_elses(client):
    alice = make_user("alice@example.com")
    bob = make_user("bob@example.com")
    mine = make_payment(
        make_order(alice),
        status="succeeded",
        intent_id="pi_a",
        charged_at=datetime(2026, 11, 3, 18, 36),
    )
    theirs = make_payment(make_order(bob), status="succeeded", intent_id="pi_b")
    headers = auth_header(client, "alice@example.com")

    response = client.get(f"/api/payments/{mine.payment_id}", headers=headers)
    assert response.status_code == 200
    assert response.get_json()["payment"]["charged_at"] == "2026-11-03T18:36:00"

    assert (
        client.get(f"/api/payments/{theirs.payment_id}", headers=headers).status_code
        == 404
    )
    assert client.get("/api/payments/99999", headers=headers).status_code == 404
