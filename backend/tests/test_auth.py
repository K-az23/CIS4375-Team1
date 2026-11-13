from app.extensions import db
from app.models import User
from app.utils.auth import check_password
from tests.helpers import PASSWORD, auth_header, make_user

URL = "/api/auth/change-password"


def test_change_password(client):
    user = make_user("a@example.com")
    headers = auth_header(client, "a@example.com")

    response = client.post(
        URL,
        json={"current_password": PASSWORD, "new_password": "brand-new-pass"},
        headers=headers,
    )
    assert response.status_code == 200

    user = db.session.get(User, user.user_id)
    db.session.refresh(user)
    assert check_password("brand-new-pass", user.password_hash)
    login = client.post(
        "/api/auth/login",
        json={"email": "a@example.com", "password": "brand-new-pass"},
    )
    assert login.status_code == 200


def test_change_password_rejects_wrong_current_password(client):
    make_user("a@example.com")
    headers = auth_header(client, "a@example.com")

    response = client.post(
        URL,
        json={"current_password": "wrong-password", "new_password": "brand-new-pass"},
        headers=headers,
    )
    assert response.status_code == 400
    assert "current_password" in response.get_json()["details"]


def test_change_password_validates_new_password(client):
    make_user("a@example.com")
    headers = auth_header(client, "a@example.com")

    for new_password in ("short", PASSWORD, ""):
        response = client.post(
            URL,
            json={"current_password": PASSWORD, "new_password": new_password},
            headers=headers,
        )
        assert response.status_code == 400
        assert "new_password" in response.get_json()["details"]


def test_change_password_requires_login(client):
    response = client.post(
        URL, json={"current_password": PASSWORD, "new_password": "brand-new-pass"}
    )
    assert response.status_code == 401