from flask import Blueprint, jsonify, request
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from ..extensions import db
from ..logic.catalog import catalog_dict, HAIR_OPTIONS, SHIPPING_DAYS
from ..logic.catalog_items import duplicate_name, item_dict, validate_item
from ..models.catalog_item import CatalogItem, utc_now
from ..utils.auth import role_required

catalog_bp = Blueprint('catalog', __name__)
admin_catalog_bp = Blueprint('admin_catalog', __name__)


def failure():
    db.session.rollback()
    return jsonify(error='Unable to access the catalog. Please try again.'), 500


# Keep the original catalog keys for the existing order and checkout code.
@catalog_bp.get('')
def get_catalog():
    try:
        items = db.session.execute(
            db.select(CatalogItem).where(CatalogItem.is_active.is_(True)).order_by(CatalogItem.item_name)
        ).scalars().all()
        return jsonify(**catalog_dict(), items=[item_dict(item) for item in items])
    except SQLAlchemyError:
        return failure()


@catalog_bp.get('/<int:item_id>')
def get_catalog_item(item_id):
    try:
        item = db.session.get(CatalogItem, item_id)
        if item is None or not item.is_active:
            return jsonify(error='Catalog product not found.'), 404
        return jsonify(item=item_dict(item))
    except SQLAlchemyError:
        return failure()


@catalog_bp.get('/<int:item_id>/options')
def get_catalog_item_options(item_id):
    try:
        item = db.session.get(CatalogItem, item_id)
        if item is None or not item.is_active:
            return jsonify(error='Catalog product not found.'), 404
        return jsonify(
            item=item_dict(item), options=HAIR_OPTIONS, shipping_days=SHIPPING_DAYS,
            custom_dimensions=item.system_type == 'full',
        )
    except SQLAlchemyError:
        return failure()


@admin_catalog_bp.get('')
@role_required('admin')
def get_admin_catalog():
    try:
        items = db.session.execute(db.select(CatalogItem).order_by(CatalogItem.item_name)).scalars().all()
        return jsonify(**catalog_dict(), items=[item_dict(item, admin=True) for item in items])
    except SQLAlchemyError:
        return failure()


@admin_catalog_bp.get('/<int:item_id>')
@role_required('admin')
def get_admin_catalog_item(item_id):
    try:
        item = db.session.get(CatalogItem, item_id)
        if item is None:
            return jsonify(error='Catalog product not found.'), 404
        return jsonify(item=item_dict(item, admin=True))
    except SQLAlchemyError:
        return failure()


@admin_catalog_bp.post('')
@role_required('admin')
def create_catalog_item():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(error='Send a JSON object.'), 400
    fields, errors = validate_item(data)
    if errors:
        return jsonify(error='Check the product details.', details=errors), 400
    try:
        if duplicate_name(fields['name_key']):
            return jsonify(error='A product with this name already exists, including inactive products.'), 409
        item = CatalogItem(**fields)
        db.session.add(item)
        db.session.commit()
        return jsonify(item=item_dict(item, admin=True)), 201
    except IntegrityError:
        db.session.rollback()
        return jsonify(error='A product with this name already exists.'), 409
    except SQLAlchemyError:
        return failure()


@admin_catalog_bp.patch('/<int:item_id>')
@role_required('admin')
def update_catalog_item(item_id):
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(error='Send a JSON object.'), 400
    try:
        item = db.session.get(CatalogItem, item_id)
        if item is None:
            return jsonify(error='Catalog product not found.'), 404
        fields, errors = validate_item(data, item)
        if errors:
            return jsonify(error='Check the product details.', details=errors), 400
        if 'name_key' in fields and duplicate_name(fields['name_key'], item_id):
            return jsonify(error='A product with this name already exists.'), 409
        result = db.session.execute(
            db.update(CatalogItem)
            .where(CatalogItem.catalog_item_id == item_id, CatalogItem.version == data['version'])
            .values(**fields, version=CatalogItem.version + 1, updated_at=utc_now())
            .execution_options(synchronize_session=False)
        )
        if result.rowcount != 1:
            db.session.rollback()
            return jsonify(error='This product changed in another window. Reload its details before saving.'), 409
        db.session.commit()
        db.session.expire_all()
        item = db.session.get(CatalogItem, item_id)
        return jsonify(item=item_dict(item, admin=True))
    except IntegrityError:
        db.session.rollback()
        return jsonify(error='A product with this name already exists.'), 409
    except SQLAlchemyError:
        return failure()


# Deactivate the listing instead of deleting products referenced by old orders.
@admin_catalog_bp.delete('/<int:item_id>')
@role_required('admin')
def deactivate_catalog_item(item_id):
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or type(data.get('version')) is not int or data['version'] < 1:
        return jsonify(error='Reload this product before deactivating it.'), 400
    if set(data) != {'version'}:
        return jsonify(error='Send only the saved product version.'), 400
    try:
        result = db.session.execute(
            db.update(CatalogItem)
            .where(CatalogItem.catalog_item_id == item_id, CatalogItem.version == data['version'])
            .values(is_active=False, version=CatalogItem.version + 1, updated_at=utc_now())
            .execution_options(synchronize_session=False)
        )
        if result.rowcount != 1:
            db.session.rollback()
            if db.session.get(CatalogItem, item_id) is None:
                return jsonify(error='Catalog product not found.'), 404
            return jsonify(error='This product changed. Reload its details before deactivating it.'), 409
        db.session.commit()
        db.session.expire_all()
        return jsonify(item=item_dict(db.session.get(CatalogItem, item_id), admin=True))
    except SQLAlchemyError:
        return failure()
