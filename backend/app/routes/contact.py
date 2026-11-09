import os

import requests
from flask import Blueprint, jsonify, request

from ..logic.contact import validate_contact_data

contact_bp = Blueprint(
    "contact",
    __name__,
)


# Delivery system unknown - route based with AWS.
# Contact form delivery will use AWS-based email/SMS notification handling.
# Exact AWS implementation is still TBD.


# POST /api/contact
# validate and forward the contact form submission
@contact_bp.post("")
def submit_contact():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify(error="Request body must be JSON"), 400

    fields, errors = validate_contact_data(data)

    if errors:
        return jsonify(error="Validation failed", details=errors), 400

    lambda_url = os.getenv("CONTACT_LAMBDA_URL")
    api_key = os.getenv("CONTACT_LAMBDA_API_KEY")

    if not lambda_url or not api_key:
        return jsonify(error="Contact service is not configured"), 503

    headers = {
        "Content-Type": "application/json",
        "x-api-key": api_key,
    }

    try:
        response = requests.post(
            lambda_url,
            json=fields,
            headers=headers,
            timeout=10,
        )
    except requests.RequestException:
        return jsonify(error="Unable to send contact messgae"), 502

    if not response.ok:
        print("Lambda status:", response.status_code)
        print("Lambda response:", response.text)
        return jsonify(error="Unable to send contact message"), 502

    return jsonify(message="Contact message sent"), 200