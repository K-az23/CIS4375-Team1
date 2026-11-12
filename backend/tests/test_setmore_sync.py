from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import pytest

from app.extensions import db
from app.logic import service as service_logic
from app.logic import setmore
from app.models.appointments import Appointment
from app.models.service import Service
from app.routes import appointment as appointment_routes
from tests.helpers import auth_header, make_user

URL = "/api/admin/appointments/sync?days=14"


@pytest.fixture
def admin_headers(client):
    make_user("admin-sync@example.com", role="admin")
    return auth_header(client, "admin-sync@example.com")


def test_list_appointments_sends_setmore_dates_and_reads_every_page(app, monkeypatch):
    calls = []
    pages = {
        None: {"data": {"appointments": [{"key": "a"}], "cursor": "page-2"}},
        "page-2": {"data": {"appointments": [{"key": "b"}], "cursor": None}},
    }

    def fake_request(method, path, **kwargs):
        params = dict(kwargs["params"])
        calls.append(params)
        return pages[params.get("cursor")]

    monkeypatch.setattr(setmore, "_request", fake_request)

    bookings = setmore.list_appointments(date(2026, 11, 12), date(2026, 11, 26))

    assert [b["key"] for b in bookings] == ["a", "b"]
    assert calls[0]["startDate"] == "12-11-2026"
    assert calls[0]["endDate"] == "26-11-2026"
    assert calls[1]["cursor"] == "page-2"


def _setup_sync(monkeypatch, bookings):
    monkeypatch.setattr(service_logic, "list_services", lambda: {"data": {"services": []}})
    monkeypatch.setattr(appointment_routes, "list_appointments", lambda **kwargs: bookings)


def test_sync_keeps_only_bookings_in_the_window(client, admin_headers, monkeypatch):
    db.session.add(Service(service_name="Mens Haircut", duration_minutes=45, price=40,
                           setmore_service_id="svc-1", is_active=True))
    db.session.commit()
    today = datetime.now(ZoneInfo("America/Chicago")).date()
    soon = (today + timedelta(days=2)).isoformat()
    _setup_sync(monkeypatch, [
        {"key": "new", "service_key": "svc-1", "start_time": f"{soon}T10:00",
         "customer": {"first_name": "Ana", "last_name": "Diaz"}},
        {"key": "old", "service_key": "svc-1", "start_time": "2016-10-04T15:00"},
    ])

    response = client.post(URL, headers=admin_headers)

    assert response.status_code == 200
    data = response.get_json()
    assert data["appointments"]["created"] == ["new"]
    assert data["ignored_outside_range"] == 1
    assert db.session.get(Appointment, "old") is None
    assert db.session.get(Appointment, "new").customer_name


def test_sync_reports_setmore_errors_as_502(client, admin_headers, monkeypatch):
    def broken():
        raise setmore.SetmoreError("SETMORE_REFRESH_TOKEN is not set")

    monkeypatch.setattr(service_logic, "list_services", broken)

    response = client.post(URL, headers=admin_headers)

    assert response.status_code == 502
    assert "SETMORE_REFRESH_TOKEN" in response.get_json()["error"]
