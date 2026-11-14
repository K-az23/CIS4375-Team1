import time
from datetime import date

import requests
from flask import current_app

# Refresh the token before it expires.
TOKEN_REFRESH_MARGIN_SECONDS = 60 * 60
REQUEST_TIMEOUT_SECONDS = 15

_token_cache = {
    "access_token": None,
    "expires_at": 0.0,
}


class SetmoreError(Exception):
    """Raised when Setmore cannot complete a request."""


def _base_url():
    base_url = current_app.config.get(
        "SETMORE_API_BASE_URL",
        "",
    ).rstrip("/")

    if not base_url:
        raise SetmoreError("SETMORE_API_BASE_URL is not set")

    return base_url


def _read_json(response):
    try:
        return response.json()
    except ValueError:
        return {}


# Exchange the saved refresh token for a temporary access token.
def _fetch_access_token():
    refresh_token = current_app.config.get(
        "SETMORE_REFRESH_TOKEN",
        "",
    )

    if not refresh_token:
        raise SetmoreError("SETMORE_REFRESH_TOKEN is not set")

    try:
        response = requests.get(
            f"{_base_url()}/o/oauth2/token",
            params={"refreshToken": refresh_token},
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
    except requests.RequestException as error:
        raise SetmoreError(
            f"Could not reach Setmore: {type(error).__name__}"
        ) from None

    body = _read_json(response)

    if response.status_code != 200 or not body.get("response"):
        reason = body.get("error") or f"HTTP {response.status_code}"
        raise SetmoreError(
            f"Setmore token exchange failed: {reason}"
        )

    token = body["data"]["token"]

    _token_cache["access_token"] = token["access_token"]
    _token_cache["expires_at"] = (
        time.time() + int(token["expires_in"])
    )

    return token["access_token"]


def get_access_token():
    still_valid = (
        time.time()
        < _token_cache["expires_at"] - TOKEN_REFRESH_MARGIN_SECONDS
    )

    if _token_cache["access_token"] and still_valid:
        return _token_cache["access_token"]

    return _fetch_access_token()


# Keep the team's shared request code and retry once for an expired token.
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
    except requests.RequestException as error:
        raise SetmoreError(
            f"Could not reach Setmore: {type(error).__name__}"
        ) from None

    if response.status_code == 401 and retry_on_401:
        _token_cache["access_token"] = None

        return _request(
            method,
            path,
            retry_on_401=False,
            **kwargs,
        )

    if not response.ok:
        raise SetmoreError(
            f"Setmore {method} {path} failed: "
            f"HTTP {response.status_code}"
        )

    return _read_json(response)


def list_services():
    return _request("GET", "/bookingapi/services")


def list_staff():
    return _request("GET", "/bookingapi/staffs")


def list_appointments(
    start_date,
    end_date,
    customer_details=True,
    **params,
):
    # Accept the dates used by our app and send Setmore its expected format.
    if isinstance(start_date, str):
        start_date = date.fromisoformat(start_date)

    if isinstance(end_date, str):
        end_date = date.fromisoformat(end_date)

    query = dict(params)

    query.update({
        "startDate": start_date.strftime("%d-%m-%Y"),
        "endDate": end_date.strftime("%d-%m-%Y"),
        "customerDetails": str(customer_details).lower(),
    })

    # Appointment logic already reads every page and saves the bookings.
    # Return one unchanged response so that existing process keeps working.
    return _request(
        "GET",
        "/bookingapi/appointments",
        params=query,
    )


# Preserve the service-category helper added in latest main.
def list_service_categories():
    return _request(
        "GET",
        "/bookingapi/services/categories",
    )