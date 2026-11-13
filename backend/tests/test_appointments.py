from datetime import datetime

import pytest
from app.extensions import db
from app.models import User
from app.models.appointments import Appointment
from app.models.service import Service

from tests.helpers import auth_header, make_user, reload


@pytest.fixture
def admin_headers(client):
    make_user("admin-appointments@example.com", role="admin")
    return auth_header(
        client,
        "admin-appointments@example.com",
    )


def make_service(name="Test Haircut"):
    service = Service(
        service_name=name,
        duration_minutes=45,
        price=40.00,
        description="Appointment test service",
        setmore_service_id=f"test-{name.lower().replace(' ', '-')}",
        is_active=True,
    )

    db.session.add(service)
    db.session.commit()

    return service


def make_appointment(
    booking_id,
    service,
    user=None,
    appointment_time=None,
    status="booked",
):
    appointment = Appointment(
        setmore_booking_id=booking_id,
        service_id=service.service_id,
        user_id=user.user_id if user else None,
        appointment_time=(
            appointment_time
            or datetime(2026, 11, 12, 12, 0)
        ),
        status=status,
    )

    db.session.add(appointment)
    db.session.commit()

    return appointment


# for 'complete' appointment
def test_admin_can_complete_appointment(client, admin_headers):
    service = make_service()
    appointment = make_appointment(
        "test-complete-001",
        service,
    )

    response = client.post(
        f"/api/admin/appointments/"
        f"{appointment.setmore_booking_id}/complete",
        headers=admin_headers,
    )

    assert response.status_code == 200
    assert response.get_json()["appointment"]["status"] == "completed"

    saved = reload(
        Appointment,
        appointment.setmore_booking_id,
    )
    assert saved.status == "completed"

    # A completed appointment cannot be finalized twice.
    response = client.post(
        f"/api/admin/appointments/"
        f"{appointment.setmore_booking_id}/complete",
        headers=admin_headers,
    )

    assert response.status_code == 409


# for no show tracking
def test_admin_can_mark_no_show_once(client, admin_headers):
    user = make_user("no-show@example.com")
    service = make_service()

    appointment = make_appointment(
        "test-no-show-001",
        service,
        user=user,
    )

    starting_count = user.no_show_count or 0

    response = client.post(
        f"/api/admin/appointments/"
        f"{appointment.setmore_booking_id}/no-show",
        headers=admin_headers,
    )

    assert response.status_code == 200
    assert response.get_json()["appointment"]["status"] == "no_show"

    saved_appointment = reload(
        Appointment,
        appointment.setmore_booking_id,
    )

    saved_user = reload(
        User,
        user.user_id,
    )

    assert saved_appointment.status == "no_show"
    assert saved_user.no_show_count == starting_count + 1

    # Sending the same request again must not increment the count twice.
    response = client.post(
        f"/api/admin/appointments/"
        f"{appointment.setmore_booking_id}/no-show",
        headers=admin_headers,
    )

    assert response.status_code == 409

    saved_user = reload(
        User,
        user.user_id,
    )

    assert saved_user.no_show_count == starting_count + 1


# for customers to see their own appointments
def test_customer_sees_only_their_own_appointments(client):
    user_one = make_user("customer-one@example.com")
    user_two = make_user("customer-two@example.com")
    service = make_service()

    make_appointment(
        "test-customer-one",
        service,
        user=user_one,
    )

    make_appointment(
        "test-customer-two",
        service,
        user=user_two,
    )

    headers = auth_header(
        client,
        "customer-one@example.com",
    )

    response = client.get(
        "/api/appointments",
        headers=headers,
    )

    assert response.status_code == 200

    appointments = response.get_json()["appointments"]

    assert len(appointments) == 1
    assert (
        appointments[0]["setmore_booking_id"]
        == "test-customer-one"
    )

# admin date filtering
def test_admin_list_filters_by_date(client, admin_headers):
    service = make_service()

    november = make_appointment(
        "test-november",
        service,
        appointment_time=datetime(
            2026,
            11,
            12,
            12,
            0,
        ),
    )

    make_appointment(
        "test-october",
        service,
        appointment_time=datetime(
            2026,
            10,
            15,
            12,
            0,
        ),
    )

    response = client.get(
        (
            "/api/admin/appointments"
            "?start=2026-11-01"
            "&end=2026-11-30"
        ),
        headers=admin_headers,
    )

    assert response.status_code == 200

    appointments = response.get_json()["appointments"]

    assert len(appointments) == 1
    assert (
        appointments[0]["setmore_booking_id"]
        == november.setmore_booking_id
    )


# admin customer filter
def test_admin_list_filters_by_user(client, admin_headers):
    user_one = make_user("filter-one@example.com")
    user_two = make_user("filter-two@example.com")
    service = make_service()

    expected = make_appointment(
        "test-filter-one",
        service,
        user=user_one,
    )

    make_appointment(
        "test-filter-two",
        service,
        user=user_two,
    )

    response = client.get(
        f"/api/admin/appointments?user_id={user_one.user_id}",
        headers=admin_headers,
    )

    assert response.status_code == 200

    appointments = response.get_json()["appointments"]

    assert len(appointments) == 1
    assert (
        appointments[0]["setmore_booking_id"]
        == expected.setmore_booking_id
    )

# validation for customer filter
def test_admin_list_rejects_invalid_user_id(
    client,
    admin_headers,
):
    response = client.get(
        "/api/admin/appointments?user_id=abc",
        headers=admin_headers,
    )

    assert response.status_code == 400