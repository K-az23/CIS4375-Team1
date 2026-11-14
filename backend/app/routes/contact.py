from flask import Blueprint, current_app, jsonify, request

from ..logic.contact import (
    ContactError,
    send_contact_notification,
    validate_contact_data,
)

contact_bp = Blueprint("contact", __name__)


# Visitors can use Contact without creating an account.
@contact_bp.post("")
def submit_contact():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify(
            error="Request body must be a JSON object"
        ), 400

    fields, errors = validate_contact_data(data)

    if errors:
        return jsonify(
            error="Please check the form fields.",
            details=errors,
        ), 400

    # Include the reason and optional phone number in the notification.
    notification_message = (
        f"Reason: {fields['reason']}\n"
        f"Phone: {fields['phone'] or 'Not provided'}\n"
        f"Message: {fields['message']}"
    )

    try:
        send_contact_notification(
            name=fields["full_name"],
            email=fields["email"],
            message=notification_message,
        )
    except ContactError as error:
        # Log the problem without printing the visitor's message or email keys.
        current_app.logger.warning(
            "Contact notification failed: %s",
            error,
        )

        return jsonify(
            error=(
                "Unable to submit your message. "
                "Please try again later."
            )
        ), error.status

    # The frontend clears its fields only after receiving this confirmation.
    return jsonify(
        success=True,
        message="Contact message submitted",
    ), 200