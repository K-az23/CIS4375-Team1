from app.models import Payment
from tests.helpers import make_order, make_payment, make_user, reload, send_webhook


def _paid_order_payment(status="pending"):
    order = make_order(make_user("a@example.com"))
    return make_payment(order, status=status, intent_id="pi_1")


def _intent(intent_id="pi_1"):
    return {"id": intent_id, "object": "payment_intent"}


def test_rejects_bad_signature(client):
    response = send_webhook(
        client, "payment_intent.succeeded", _intent(), secret="whsec_wrong"
    )
    assert response.status_code == 400


def test_rejects_missing_signature(client):
    assert client.post("/api/webhooks/stripe", data="{}").status_code == 400


def test_success_marks_payment_and_time(client):
    payment = _paid_order_payment()

    assert (
        send_webhook(client, "payment_intent.succeeded", _intent()).status_code == 200
    )

    updated = reload(Payment, payment.payment_id)
    assert updated.status == "succeeded"
    assert updated.charged_at is not None


def test_late_failure_never_undoes_success(client):
    payment = _paid_order_payment(status="succeeded")

    send_webhook(client, "payment_intent.payment_failed", _intent())

    assert reload(Payment, payment.payment_id).status == "succeeded"


def test_full_refund_marks_refunded(client):
    payment = _paid_order_payment(status="succeeded")
    charge = {
        "id": "ch_1",
        "object": "charge",
        "refunded": True,
        "payment_intent": "pi_1",
    }

    send_webhook(client, "charge.refunded", charge)

    assert reload(Payment, payment.payment_id).status == "refunded"


def test_partial_refund_is_ignored(client):
    payment = _paid_order_payment(status="succeeded")
    charge = {
        "id": "ch_1",
        "object": "charge",
        "refunded": False,
        "payment_intent": "pi_1",
    }

    send_webhook(client, "charge.refunded", charge)

    assert reload(Payment, payment.payment_id).status == "succeeded"


def test_canceled_intent_marks_cancelled(client):
    payment = _paid_order_payment()

    send_webhook(client, "payment_intent.canceled", _intent())

    assert reload(Payment, payment.payment_id).status == "cancelled"


def test_unknown_payment_is_acknowledged(client):
    # Stripe retries anything that isn't 2xx, so unknown events still get 200.
    assert (
        send_webhook(
            client, "payment_intent.succeeded", _intent("pi_other")
        ).status_code
        == 200
    )
