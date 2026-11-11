from flask import Blueprint, jsonify

contact_bp = Blueprint(
    "contact",
    __name__,
    url_prefix="/api/contact"
)


# Delivery system unknown - route based with AWS.
# Contact form delivery will use AWS-based email/SMS notification handling.
# Exact AWS implementation is still TBD.


# POST /api/contact
@contact_bp.route("", methods=["POST"])
def submit_contact_form():
    return jsonify({
        "success": False,
        "message": "Contact form endpoint not implemented yet."
    }), 501