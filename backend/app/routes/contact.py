from flask import Blueprint, jsonify, request

from ..logic.contact import (
    ContactError,
    send_contact_notification,
    validate_contact_data,
)

contact_bp = Blueprint(
    "contact",
    __name__,
)



# POST /api/contact
# validate and forward the contact form submission
@contact_bp.post("")
def submit_contact():
    data = request.get_json(silent=True) or {}

    if not isinstance(data, dict):
        return jsonify(error="Request body must be JSON"), 400

    fields, errors = validate_contact_data(data)

    if errors:
        return jsonify(error="Validation failed", details=errors), 400

    notification_message = (
        f"Reason: {fields['reason']} | "
        f"Phone: {fields['phone'] or 'Not provided'} |"
        f"Message: {fields['message']}"
    )

    try:
        send_contact_notification(
            name=fields["full_name"],
            email=fields["email"],
            message=notification_message
        )
    except ContactError as exc:
        print("Contact error:", exc)
        return jsonify(error="Unable to send contact message"), 502

    return jsonify(message="Contact message sent"), 200