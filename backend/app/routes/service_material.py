from flask import Blueprint, jsonify, request
from sqlalchemy.exc import SQLAlchemyError

from ..extensions import db
from ..models import InventoryItem, Service, ServiceItem
from ..utils.auth import role_required

service_material_bp = Blueprint('service_material', __name__)


# Include the item name and unit so the frontend can show readable rows.
# An inactive item stays visible in an old list so the admin can remove it.
def material_list(service_id):
    query = db.select(ServiceItem).where(ServiceItem.service_id == service_id)
    saved_materials = db.session.execute(query).scalars().all()
    materials = []
    for saved in saved_materials:
        item = saved.inventory_item
        materials.append({
            'service_item_id': saved.service_item_id,
            'item_id': saved.item_id,
            'service_id': saved.service_id,
            'default_quantity_used': saved.default_quantity_used,
            'item_name': item.item_name if item else f'Item #{saved.item_id}',
            'brand': item.brand if item else None,
            'unit': item.unit if item else None,
            'is_active': item.is_active if item else False,
        })
    materials.sort(key=lambda material: material['item_name'].lower())
    return materials


# BOM-01: read the default materials for one service.
@service_material_bp.get('/<int:service_id>/materials')
@role_required('admin')
def get_service_materials(service_id):
    service = db.session.get(Service, service_id)
    if service is None:
        return jsonify(error='Service not found'), 404
    return jsonify(materials=material_list(service_id))


# BOM-02: replace this service's default list with the list the admin saved.
# Validate every row first. A bad row must not erase the old saved list.
@service_material_bp.put('/<int:service_id>/materials')
@role_required('admin')
def save_service_materials(service_id):
    # Lock this service while writing, so two saves cannot mix their lists.
    service_query = db.select(Service).where(Service.service_id == service_id).with_for_update()
    service = db.session.execute(service_query).scalar_one_or_none()
    if service is None:
        return jsonify(error='Service not found'), 404
    if not service.is_active:
        return jsonify(error='Inactive services cannot be changed'), 400

    data = request.get_json(silent=True)
    if not isinstance(data, dict) or not isinstance(data.get('materials'), list):
        return jsonify(error='Send a materials list'), 400

    materials = data['materials']
    used_item_ids = set()
    for row in materials:
        if not isinstance(row, dict):
            return jsonify(error='Each material must be an object'), 400

        item_id = row.get('item_id')
        quantity = row.get('default_quantity_used')
        if isinstance(item_id, bool) or not isinstance(item_id, int):
            return jsonify(error='Each material needs an inventory item ID'), 400
        if item_id in used_item_ids:
            return jsonify(error='Choose each inventory item only once'), 400
        used_item_ids.add(item_id)

        if isinstance(quantity, bool) or not isinstance(quantity, int) or quantity < 1 or quantity > 2147483647:
            return jsonify(error='Each default quantity must be a whole number from 1 to 2147483647'), 400

        item = db.session.get(InventoryItem, item_id)
        if item is None or not item.is_active:
            return jsonify(error='A selected inventory item is missing or inactive'), 400

    # Change only the mapping rows for this service. Inventory stock, other
    # services, and past usage records are not changed by saving defaults.
    try:
        query = db.select(ServiceItem).where(ServiceItem.service_id == service_id)
        old_materials = db.session.execute(query).scalars().all()
        for old_material in old_materials:
            db.session.delete(old_material)
        for row in materials:
            saved = ServiceItem(
                service_id=service_id,
                item_id=row['item_id'],
                default_quantity_used=row['default_quantity_used'],
            )
            db.session.add(saved)
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify(error='Unable to save service materials'), 500

    return jsonify(materials=material_list(service_id))
