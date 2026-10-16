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