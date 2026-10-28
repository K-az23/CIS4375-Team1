from flask import Blueprint, jsonify, request
from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..logic.service import (
    service_name_taken,
    setmore_service_id_taken,
    validate_service_data,
)
from ..models import Service

service_bp = Blueprint("service", __name__)
admin_service_bp = Blueprint("admin_service", __name__)

DUPLICATE_ERROR = "A service with this name or Setmore ID already exists"


def _duplicate_error(fields, exclude_service_id=None):
    if "service_name" in fields and service_name_taken(
        fields["service_name"], exclude_service_id
    ):
        return "A service with this name already exists"
    setmore_id = fields.get("setmore_service_id")
    if setmore_id and setmore_service_id_taken(setmore_id, exclude_service_id):
        return "This Setmore service ID is already linked to another service"
    return None


def _commit_or_conflict():
    # The checks above catch duplicates in normal use; the database's UNIQUE
    # constraints still catch two identical requests arriving at once.
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify(error=DUPLICATE_ERROR), 409
    return None


@service_bp.get("")
def list_services():
    query = (
        db.select(Service)
        .where(Service.is_active.is_(True))
        .order_by(Service.service_name)
    )
    services = db.session.execute(query).scalars().all()
    return jsonify(services=[service.to_public_dict() for service in services])


@service_bp.get("/<int:service_id>")
def get_service(service_id):
    service = db.session.get(Service, service_id)
    # Inactive services return 404 so customers can't view or book them.
    if service is None or not service.is_active:
        return jsonify(error="Service not found"), 404
    return jsonify(service=service.to_public_dict())


@admin_service_bp.get("")
def list_admin_services():
    # TODO: restrict to admins with @role_required("admin") once login (AUTH-02) exists
    query = db.select(Service).order_by(Service.service_name)
    if request.args.get("include_inactive", "false").lower() != "true":
        query = query.where(Service.is_active.is_(True))
    services = db.session.execute(query).scalars().all()
    return jsonify(services=[service.to_admin_dict() for service in services])


@admin_service_bp.post("")
def create_service():
    # TODO: restrict to admins with @role_required("admin") once login (AUTH-02) exists
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(error="Request body must be a JSON object"), 400

    fields, errors = validate_service_data(data)
    if errors:
        return jsonify(error="Validation failed", details=errors), 400

    duplicate = _duplicate_error(fields)
    if duplicate:
        return jsonify(error=duplicate), 409

    service = Service(**fields)
    db.session.add(service)
    conflict = _commit_or_conflict()
    if conflict:
        return conflict
    return jsonify(service=service.to_admin_dict()), 201


@admin_service_bp.patch("/<int:service_id>")
def update_service(service_id):
    # TODO: restrict to admins with @role_required("admin") once login (AUTH-02) exists
    service = db.session.get(Service, service_id)
    if service is None:
        return jsonify(error="Service not found"), 404

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(error="Request body must be a JSON object"), 400

    fields, errors = validate_service_data(data, partial=True)
    if errors:
        return jsonify(error="Validation failed", details=errors), 400
    if not fields:
        return jsonify(
            error=(
                "No editable fields sent: use service_name, description, "
                "duration_minutes, price, setmore_service_id, or is_active"
            )
        ), 400

    duplicate = _duplicate_error(fields, exclude_service_id=service.service_id)
    if duplicate:
        return jsonify(error=duplicate), 409

    for name, value in fields.items():
        setattr(service, name, value)
    conflict = _commit_or_conflict()
    if conflict:
        return conflict
    return jsonify(service=service.to_admin_dict())


@admin_service_bp.delete("/<int:service_id>")
def deactivate_service(service_id):
    # TODO: restrict to admins with @role_required("admin") once login (AUTH-02) exists
    service = db.session.get(Service, service_id)
    if service is None:
        return jsonify(error="Service not found"), 404

    # Deactivate instead of deleting, so past appointments and service
    # materials that reference this service stay intact.
    service.is_active = False
    db.session.commit()
    return jsonify(service=service.to_admin_dict())