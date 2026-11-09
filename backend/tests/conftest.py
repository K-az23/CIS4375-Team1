from unittest import mock

import pytest
from app import create_app
from app.config import Config
from app.extensions import db
from app.logic import payment as payment_logic
from app.models import Role

from tests.helpers import WEBHOOK_SECRET


@pytest.fixture
def app(monkeypatch):
    # Tests run against a throwaway in-memory database, never the real one.
    monkeypatch.setattr(Config, "SQLALCHEMY_DATABASE_URI", "sqlite://")
    monkeypatch.setattr(Config, "SQLALCHEMY_ENGINE_OPTIONS", {})
    monkeypatch.setattr(Config, "SECRET_KEY", "test-secret-key-" + "x" * 32)
    monkeypatch.setattr(Config, "JWT_SECRET_KEY", "test-jwt-key-" + "y" * 32)
    monkeypatch.setattr(Config, "STRIPE_SECRET_KEY", "sk_test_fake")
    monkeypatch.setattr(Config, "STRIPE_WEBHOOK_SECRET", WEBHOOK_SECRET)

    app = create_app()
    with app.app_context():
        db.create_all()
        db.session.add_all([Role(name="customer"), Role(name="admin")])
        db.session.commit()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def fake_stripe():
    """Replace Stripe with a fake so tests never call the real API."""
    fake = mock.MagicMock()
    with mock.patch.object(payment_logic.stripe, "StripeClient", return_value=fake):
        yield fake
