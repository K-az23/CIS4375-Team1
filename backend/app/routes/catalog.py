from flask import Blueprint, jsonify

from ..logic.catalog import catalog_dict

catalog_bp = Blueprint("catalog", __name__)


# GET /api/catalog
@catalog_bp.get("")
def get_catalog():
    return jsonify(catalog_dict())