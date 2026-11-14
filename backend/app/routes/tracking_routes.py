from flask import Blueprint, jsonify, request
from sqlalchemy.exc import SQLAlchemyError

from ..extensions import db
from ..logic.purchasing import validate_purchase
from ..models.purchase import Purchase, utc_now
from ..utils.auth import role_required

purchasing_bp = Blueprint('purchasing', __name__, url_prefix='/api/admin/purchasing')


# Read supplier records without changing customer orders or inventory stock.
@purchasing_bp.get('')
@role_required('admin')
def get_purchasing_records():
    try:
        purchases = db.session.execute(
            db.select(Purchase).order_by(Purchase.purchase_id.desc())
        ).scalars().all()
        return jsonify(purchases=[purchase.to_dict() for purchase in purchases])
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify(error='Unable to load purchases.'), 500


@purchasing_bp.get('/<int:purchase_id>')
@role_required('admin')
def get_purchasing_record(purchase_id):
    try:
        purchase = db.session.get(Purchase, purchase_id)
        if purchase is None:
            return jsonify(error='Purchase not found.'), 404
        return jsonify(purchase=purchase.to_dict())
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify(error='Unable to load purchase details.'), 500


# Validate the form before saving a new purchase.
@purchasing_bp.post('')
@role_required('admin')
def create_purchasing_record():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(error='Send a JSON object.'), 400
    fields, errors = validate_purchase(data)
    if errors:
        return jsonify(error='Check the purchase details.', details=errors), 400
    try:
        purchase = Purchase(**fields)
        db.session.add(purchase)
        db.session.commit()
        return jsonify(purchase=purchase.to_dict()), 201
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify(error='Unable to create the purchase. Please try again.'), 500


@purchasing_bp.patch('/<int:purchase_id>')
@role_required('admin')
def update_purchasing_record(purchase_id):
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(error='Send a JSON object.'), 400
    try:
        purchase = db.session.get(Purchase, purchase_id)
        if purchase is None:
            return jsonify(error='Purchase not found.'), 404
        fields, errors = validate_purchase(data, purchase)
        if errors:
            return jsonify(error='Check the purchase details.', details=errors), 400

        # Only save if nobody changed this record since this form was opened.
        result = db.session.execute(
            db.update(Purchase)
            .where(Purchase.purchase_id == purchase_id, Purchase.version == data['version'])
            .values(**fields, version=Purchase.version + 1, updated_at=utc_now())
            .execution_options(synchronize_session=False)
        )
        if result.rowcount != 1:
            db.session.rollback()
            return jsonify(error='This purchase changed in another window. Reload its details before saving.'), 409
        db.session.commit()
        db.session.expire_all()
        purchase = db.session.get(Purchase, purchase_id)
        return jsonify(purchase=purchase.to_dict())
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify(error='Unable to update the purchase. Please try again.'), 500
