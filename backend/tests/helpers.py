import hashlib
import hmac
import itertools
import json
import time
from decimal import Decimal

from app.extensions import db
from app.models import HairpieceOrder, Payment, Role, User
from app.utils.auth import hash_password

WEBHOOK_SECRET = "whsec_test"
PASSWORD = "password123"
_phone_numbers = itertools.count(7135550000)


def make_user(email, role="customer"):
    role_row = db.session.execute(db.select(Role).where(Role.name == role)).scalar_one()
    user = User(
        role_id=role_row.role_id,
        first_name="Test",
        last_name=role.title(),
        email=email,
        phone=f"+1{next(_phone_numbers)}",
        password_hash=hash_password(PASSWORD),
        no_show_count=0,
        is_member=False,
        is_active=True,
    )
    db.session.add(user)
    db.session.commit()
    return user


def auth_header(client, email):
    response = client.post(
        "/api/auth/login", json={"email": email, "password": PASSWORD}
    )
    return {"Authorization": f"Bearer {response.get_json()['access_token']}"}


def make_order(user, price="349.99", status="invoice_sent"):
    order = HairpieceOrder(
        user_id=user.user_id, price=Decimal(price), order_status=status
    )
    db.session.add(order)
    db.session.commit()
    return order


def make_payment(order, status="pending", intent_id="pi_test", **fields):
    payment = Payment(
        order_id=order.order_id,
        payment_method=fields.pop("payment_method", "card"),
        amount=order.price,
        payment_type="hairpiece_order",
        status=status,
        stripe_payment_intent_id=intent_id,
        **fields,
    )
    db.session.add(payment)
    db.session.commit()
    return payment


def send_webhook(client, event_type, stripe_object, secret=WEBHOOK_SECRET):
    """POST an event signed the same way Stripe signs real webhooks."""
    body = json.dumps(
        {
            "id": "evt_test",
            "object": "event",
            "type": event_type,
            "data": {"object": stripe_object},
        }
    )
    timestamp = int(time.time())
    signature = hmac.new(
        secret.encode(), f"{timestamp}.{body}".encode(), hashlib.sha256
    ).hexdigest()
    return client.post(
        "/api/webhooks/stripe",
        data=body,
        headers={
            "Stripe-Signature": f"t={timestamp},v1={signature}",
            "Content-Type": "application/json",
        },
    )


def reload(model, primary_key):
    # Requests commit in the same session, so drop cached rows before re-reading.
    db.session.expire_all()
    return db.session.get(model, primary_key)
