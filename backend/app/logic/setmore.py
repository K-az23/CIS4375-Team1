import time

import requests
from flask import current_app

# Refresh the access token this long before Setmore says it expires,
# so a request never goes out with a token that's about to lapse.
TOKEN_REFRESH_MARGIN_SECONDS = 60 * 60
REQUEST_TIMEOUT_SECONDS = 15

_token_cache = {"access_token": None, "expires_at": 0.0}


class SetmoreError(Exception):
    """Raised when Setmore can't be reached or rejects a request.

    Messages never include tokens, so they're safe to log.
    """


def _base_url():
    base_url = current_app.config.get("SETMORE_API_BASE_URL", "").rstrip("/")
    if not base_url:
        raise SetmoreError("SETMORE_API_BASE_URL is not set")
    return base_url


def _read_json(response):
    try:
        return response.json()
    except ValueError:
        return {}


def _fetch_access_token():
    refresh_token = current_app.config.get("SETMORE_REFRESH_TOKEN", "")
    if not refresh_token:
        raise SetmoreError("SETMORE_REFRESH_TOKEN is not set")

    try:
        response = requests.get(
            f"{_base_url()}/o/oauth2/token",
            params={"refreshToken": refresh_token},
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
    except requests.RequestException as e:
        raise SetmoreError(f"Could not reach Setmore: {type(e).__name__}") from None

    body = _read_json(response)
    if response.status_code != 200 or not body.get("response"):
        reason = body.get("error") or f"HTTP {response.status_code}"
        raise SetmoreError(f"Setmore token exchange failed: {reason}")

    token = body["data"]["token"]
    _token_cache["access_token"] = token["access_token"]
    _token_cache["expires_at"] = time.time() + int(token["expires_in"])
    return token["access_token"]


def get_access_token():
    still_valid = time.time() < _token_cache["expires_at"] - TOKEN_REFRESH_MARGIN_SECONDS
    if _token_cache["access_token"] and still_valid:
        return _token_cache["access_token"]
    return _fetch_access_token()


def _request(method, path, retry_on_401=True, **kwargs):
    headers = {
        "Authorization": f"Bearer {get_access_token()}",
        "Content-Type": "application/json",
    }
    try:
        response = requests.request(
            method,
            f"{_base_url()}{path}",
            headers=headers,
            timeout=REQUEST_TIMEOUT_SECONDS,
            **kwargs,
        )
    except requests.RequestException as e:
        raise SetmoreError(f"Could not reach Setmore: {type(e).__name__}") from None

    if response.status_code == 401 and retry_on_401:
        # The access token was rejected early (for example, revoked);
        # get a fresh one and try once more.
        _token_cache["access_token"] = None
        return _request(method, path, retry_on_401=False, **kwargs)

    if not response.ok:
        raise SetmoreError(f"Setmore {method} {path} failed: HTTP {response.status_code}")
    return _read_json(response)


def list_services():
    return _request("GET", "/bookingapi/services")


def list_staff():
    return _request("GET", "/bookingapi/staffs")

# get appointments from Setmore by date range
# Setmore's booking API reads dates as day-month-year; an ISO date
# (2026-11-12) isn't understood and it returns old bookings instead.
SETMORE_DATE_FORMAT = "%d-%m-%Y"
# Safety stop so a cursor that never ends can't loop forever.
MAX_APPOINTMENT_PAGES = 20


def list_appointments(start_date, end_date, customer_details=True):
    """Return a complete result, or fail instead of returning partial bookings."""
    query = {
        "startDate": start_date.strftime(SETMORE_DATE_FORMAT),
        "endDate": end_date.strftime(SETMORE_DATE_FORMAT),
        "customerDetails": str(customer_details).lower(),
    }
    bookings = []
    cursors = set()
    booking_ids = set()

    for _ in range(MAX_APPOINTMENT_PAGES):
        body = _request("GET", "/bookingapi/appointments", params=query)

        if not isinstance(body, dict) or body.get("response") is False:
            raise SetmoreError(
                "Setmore did not return a successful booking list"
            )

        data = body.get("data")

        if not isinstance(data, dict) or not isinstance(
            data.get("appointments"), list
        ):
            raise SetmoreError(
                "Setmore returned an unexpected booking list"
            )

        for booking in data["appointments"]:
            booking_id = (
                booking.get("key")
                if isinstance(booking, dict)
                else None
            )

            if not isinstance(booking_id, str) or not booking_id.strip():
                raise SetmoreError(
                    "Setmore returned a booking without an ID"
                )

            if booking_id in booking_ids:
                raise SetmoreError(
                    "Setmore repeated a booking; try syncing again"
                )

            booking_ids.add(booking_id)
            bookings.append(booking)

        outer_cursor = body.get("cursor")
        inner_cursor = data.get("cursor")

        if outer_cursor and inner_cursor and outer_cursor != inner_cursor:
            raise SetmoreError(
                "Setmore returned conflicting page cursors"
            )

        cursor = outer_cursor or inner_cursor

        if not cursor:
            return bookings

        if not isinstance(cursor, str) or cursor in cursors:
            raise SetmoreError(
                "Setmore repeated an appointment page"
            )

        cursors.add(cursor)
        query["cursor"] = cursor

    raise SetmoreError(
        "Setmore has more booking pages than the sync limit"
    )
def list_service_categories():
    """Fetch Setmore service categories."""
    return _request("GET", "/bookingapi/services/categories")