from flask import Blueprint, jsonify

from ..extensions import db
from ..models import Service

service_bp = Blueprint("service", __name__)


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