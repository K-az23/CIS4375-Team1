from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from ..extensions import db
from ..logic.user import validate_user_update_data
from ..models import User
from ..models.hair_specification import HairSpecification, utc_now
from ..logic.hair_specification import name_taken, validate_specification
from ..utils.auth import role_required

user_bp = Blueprint(
    "users",
    __name__,
)



# GET /api/users/me
# returns the current authenticated customer profile
@user_bp.get("/me")
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()
    user = db.session.get(User, int(user_id))

    if user is None:
        return jsonify(error="User not found"), 404

    if not user.is_active:
        return jsonify(error="Account is inactive"), 403

    return jsonify(user=user.to_dict())



# PATCH /api/users/me
# updates for the fields allowed to be edited
@user_bp.patch("/me")
@jwt_required()
def update_profile():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)

    if user is None:
        return jsonify(error="User not found"), 404

    if not user.is_active:
        return jsonify(error="Account is inactive"), 403

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify(error="Request body must be JSON"), 400

    fields, errors = validate_user_update_data(data, user_id=user.user_id,)

    if errors:
        return jsonify(error="Validation failed", details=errors), 400

    if not fields:
        return jsonify(error="No editable fields sent"), 400

    for name, value in fields.items():
        setattr(user, name, value)

    try:
        db.session.commit()

    except SQLAlchemyError:
        db.session.rollback()
        return jsonify(error="Unable to update account"), 500

    return jsonify(user=user.to_dict())


# Need to work on

# GET /api/users/me/hairpiece-orders
@user_bp.route("/me/hairpiece-orders", methods=["GET"])
def get_current_user_hairpiece_orders():
    return jsonify({
        "success": False,
        "message": "Get current user hairpiece orders endpoint not implemented yet"
    }), 501

# GET /api/users/me/appointments
@user_bp.route("/me/appointments", methods=["GET"])
def get_current_user_appointments():
    return jsonify({
        "success": False,
        "message": "Get current user appointments endpoint not implemented yet."
    }), 501

# GET /api/users/me/payments
@user_bp.route("/me/payments", methods=["GET"])
def get_current_user_payments():
    return jsonify({
        "success": False,
        "message": "Get current user payment history endpoint not implemented yet."
    }), 501


# Only the signed-in customer can read or change their own saved choices.
@user_bp.get('/me/hair-specifications')
@role_required('customer')
def get_current_user_hair_specifications():
    try:
        user_id = int(get_jwt_identity())
        specifications = db.session.execute(
            db.select(HairSpecification)
            .where(HairSpecification.user_id == user_id)
            .order_by(HairSpecification.updated_at.desc(), HairSpecification.specification_id.desc())
        ).scalars().all()
        return jsonify(specifications=[item.to_dict() for item in specifications])
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify(error='Unable to load saved hair choices.'), 500


@user_bp.post('/me/hair-specifications')
@role_required('customer')
def create_current_user_hair_specification():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(error='Send a JSON object.'), 400
    fields, errors = validate_specification(data)
    if errors:
        return jsonify(error='Check your hair choices.', details=errors), 400
    try:
        user_id = int(get_jwt_identity())
        if name_taken(user_id, fields['name_key']):
            return jsonify(error='You already have saved choices with this name. Edit them or choose another name.'), 409
        item = HairSpecification(user_id=user_id, **fields)
        db.session.add(item)
        db.session.commit()
        return jsonify(specification=item.to_dict()), 201
    except IntegrityError:
        db.session.rollback()
        return jsonify(error='You already have saved choices with this name.'), 409
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify(error='Unable to save your hair choices. Please try again.'), 500


@user_bp.patch('/me/hair-specifications/<int:specification_id>')
@role_required('customer')
def update_current_user_hair_specification(specification_id):
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(error='Send a JSON object.'), 400
    try:
        user_id = int(get_jwt_identity())
        item = db.session.execute(db.select(HairSpecification).where(
            HairSpecification.specification_id == specification_id,
            HairSpecification.user_id == user_id,
        )).scalar_one_or_none()
        if item is None:
            return jsonify(error='Saved hair choices not found.'), 404
        fields, errors = validate_specification(data, item)
        if errors:
            return jsonify(error='Check your hair choices.', details=errors), 400
        if 'name_key' in fields and name_taken(user_id, fields['name_key'], specification_id):
            return jsonify(error='You already have saved choices with this name.'), 409

        # The version check prevents an older form from replacing a newer save.
        result = db.session.execute(
            db.update(HairSpecification)
            .where(HairSpecification.specification_id == specification_id,
                   HairSpecification.user_id == user_id, HairSpecification.version == data['version'])
            .values(**fields, version=HairSpecification.version + 1, updated_at=utc_now())
            .execution_options(synchronize_session=False)
        )
        if result.rowcount != 1:
            db.session.rollback()
            return jsonify(error='These choices changed in another window. Reload the saved choices before saving.'), 409
        db.session.commit()
        db.session.expire_all()
        item = db.session.get(HairSpecification, specification_id)
        return jsonify(specification=item.to_dict())
    except IntegrityError:
        db.session.rollback()
        return jsonify(error='You already have saved choices with this name.'), 409
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify(error='Unable to update your hair choices. Please try again.'), 500
