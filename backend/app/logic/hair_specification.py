from ..extensions import db
from ..models.hair_specification import HairSpecification
from .catalog import SPEC_COLUMNS, SYSTEM_TYPES, validate_hair_specs

EDITABLE_FIELDS = {'name', 'system_type', 'specs'}


def validate_specification(data, current=None):
    fields = {}
    errors = {}
    unknown = set(data) - EDITABLE_FIELDS - ({'version'} if current else set())
    if unknown:
        errors['fields'] = 'Unknown fields: ' + ', '.join(sorted(unknown))

    if 'name' in data:
        name = data['name']
        if not isinstance(name, str) or not name.strip() or len(name.strip()) > 100:
            errors['name'] = 'Enter a name from 1 through 100 characters.'
        else:
            fields['name'] = name.strip()
            fields['name_key'] = ' '.join(name.split()).casefold()
    elif current is None:
        errors['name'] = 'A name is required.'

    system_type = data.get('system_type', current.system_type if current else None)
    if not isinstance(system_type, str) or system_type not in SYSTEM_TYPES:
        errors['system_type'] = 'Choose an area system or full custom system.'
    else:
        fields['system_type'] = system_type

    if 'specs' in data:
        if not isinstance(data['specs'], dict):
            errors['specs'] = 'Hair choices must be an object.'
        else:
            unknown_specs = set(data['specs']) - set(SPEC_COLUMNS)
            if unknown_specs:
                errors['specs'] = 'Unknown hair choices: ' + ', '.join(sorted(unknown_specs))
    elif current is None:
        errors['specs'] = 'Choose every hair option.'

    if current is not None:
        if type(data.get('version')) is not int or data['version'] < 1:
            errors['version'] = 'Reload your saved choices before editing.'
        if not (set(data) & EDITABLE_FIELDS):
            errors['fields'] = 'Send at least one editable field.'

    if errors:
        return fields, errors

    # For an update, keep the saved choices that were not included in the request.
    specs = current.to_dict()['specs'] if current else {}
    specs.update(data.get('specs', {}))
    columns, spec_errors = validate_hair_specs(specs, system_type)
    for name, message in spec_errors.items():
        errors['specs.' + name] = message
    fields.update(columns)
    return fields, errors


def name_taken(user_id, name_key, exclude_id=None):
    query = db.select(HairSpecification.specification_id).where(
        HairSpecification.user_id == user_id, HairSpecification.name_key == name_key,
    )
    if exclude_id is not None:
        query = query.where(HairSpecification.specification_id != exclude_id)
    return db.session.execute(query).first() is not None
