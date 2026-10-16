from flask import Blueprint, jsonify, request

from ..extensions import db
from ..logic.service import new_service_id, service_name_taken, validate_service_data
from ..models import Service

service_bp = Blueprint("service", __name__)
admin_service_bp = Blueprint("admin_service", __name__)

@service_bp.get("")
def list_services():
    query = db.select(Service).order_by(Service.service_name)
    # TODO: filter with Service.is_active once the database manager adds the column
    services = db.session.execute(query).scalars().all()
    return jsonify(services=[service.to_public_dict() for service in services])

@service_bp.get("/<service_id>")
def get_service(service_id):
    service = db.session.get(Service, service_id)
    # TODO: also return 404 for inactive services once the is_active column exists
    if service is None:
        return jsonify(error="Service not found"), 404
    return jsonify(service=service.to_public_dict())

@admin_service_bp.get("")
def list_admin_services():
    # TODO: restrict to admins with @role_required("admin") once login (AUTH-02) exists
    # TODO: hide inactive services unless ?include_inactive=true, once is_active exists
    query = db.select(Service).order_by(Service.service_name)
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

    if service_name_taken(fields["service_name"]):
        return jsonify(error="A service with this name already exists"), 409

    service = Service(service_id=new_service_id(), **fields)
    db.session.add(service)
    db.session.commit()
    return jsonify(service=service.to_admin_dict()), 201 