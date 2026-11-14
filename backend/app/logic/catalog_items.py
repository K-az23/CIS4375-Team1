from ..extensions import db
from ..models.catalog_item import CatalogItem
from .catalog import SYSTEM_TYPES, FULL_SYSTEM

EDITABLE_FIELDS = {'item_name', 'description', 'system_type', 'is_active'}


def item_dict(item, admin=False):
    system = SYSTEM_TYPES[item.system_type]
    data = {
        'catalog_item_id': item.catalog_item_id,
        'item_name': item.item_name,
        'description': item.description,
        'system_type': item.system_type,
        'system_label': system['label'],
        'price': float(system['price']),
        'price_is_minimum': item.system_type == FULL_SYSTEM,
    }
    if admin:
        data.update(is_active=item.is_active, version=item.version)
    return data


def validate_item(data, current=None):
    fields = {}
    errors = {}
    unknown = set(data) - EDITABLE_FIELDS - ({'version'} if current else set())
    if unknown:
        errors['fields'] = 'Unknown fields: ' + ', '.join(sorted(unknown))

    for name, limit in [('item_name', 120), ('description', 2000)]:
        if name not in data:
            if current is None:
                if name == 'description':
                    fields[name] = ''
                else:
                    errors[name] = 'A product name is required.'
            continue
        value = data[name]
        if not isinstance(value, str) or len(value.strip()) > limit or (name == 'item_name' and not value.strip()):
            errors[name] = f'Enter text up to {limit} characters' + (' and do not leave it blank.' if name == 'item_name' else '.')
        else:
            fields[name] = value.strip()

    if 'item_name' in fields:
        fields['name_key'] = ' '.join(fields['item_name'].split()).casefold()

    if 'system_type' in data:
        if not isinstance(data['system_type'], str) or data['system_type'] not in SYSTEM_TYPES:
            errors['system_type'] = 'Choose an area system or a full custom system.'
        else:
            fields['system_type'] = data['system_type']
    elif current is None:
        errors['system_type'] = 'Choose a system type.'

    if 'is_active' in data:
        if type(data['is_active']) is not bool:
            errors['is_active'] = 'Active must be true or false.'
        else:
            fields['is_active'] = data['is_active']
    elif current is None:
        fields['is_active'] = True

    if current is not None:
        if type(data.get('version')) is not int or data['version'] < 1:
            errors['version'] = 'Reload the saved product before editing.'
        if not (set(data) & EDITABLE_FIELDS):
            errors['fields'] = 'Send at least one editable field.'
    return fields, errors


def duplicate_name(name_key, exclude_id=None):
    query = db.select(CatalogItem.catalog_item_id).where(CatalogItem.name_key == name_key)
    if exclude_id is not None:
        query = query.where(CatalogItem.catalog_item_id != exclude_id)
    return db.session.execute(query).first() is not None


def order_catalog_item(value):
    # Recheck availability when saving, because the listing may have changed.
    if type(value) is not int or value < 1:
        return None, {'catalog_item_id': 'Choose a valid catalog product.'}
    item = db.session.execute(
        db.select(CatalogItem).where(CatalogItem.catalog_item_id == value).with_for_update()
    ).scalar_one_or_none()
    if item is None or not item.is_active:
        return None, {'catalog_item_id': 'This product is no longer available. Choose another product.'}
    if item.system_type != 'area':
        return None, {'catalog_item_id': 'Full systems require a consultation and an invoice.'}
    return item, {}
