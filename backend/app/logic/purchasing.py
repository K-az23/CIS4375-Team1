from datetime import date, datetime, time, UTC
from zoneinfo import ZoneInfo

from ..models.purchase import PURCHASE_STATUSES, utc_now

EDITABLE_FIELDS = {
    'supplier_name', 'item_name', 'quantity', 'status', 'ordered_at', 'received_at', 'notes',
}


def read_date(value):
    # The form uses salon dates. Store their midnight in UTC for consistent display.
    if value is None or value == '':
        return None
    if not isinstance(value, str):
        raise ValueError('Enter a date as YYYY-MM-DD.')
    day = date.fromisoformat(value)
    if day.isoformat() != value or not 1900 <= day.year <= 9998:
        raise ValueError('Enter a date as YYYY-MM-DD, from 1900 through 9998.')
    return datetime.combine(day, time.min, ZoneInfo('America/Chicago')).astimezone(UTC).replace(tzinfo=None)


def validate_purchase(data, current=None):
    errors = {}
    fields = {}
    unknown = set(data) - EDITABLE_FIELDS - ({'version'} if current else set())
    if unknown:
        errors['fields'] = 'Unknown fields: ' + ', '.join(sorted(unknown))

    for key, limit in [('supplier_name', 120), ('item_name', 200), ('notes', 2000)]:
        if key not in data:
            if current is None:
                if key == 'notes':
                    fields[key] = ''
                else:
                    errors[key] = 'This field is required.'
            continue
        value = data[key]
        if not isinstance(value, str) or len(value.strip()) > limit or (key != 'notes' and not value.strip()):
            errors[key] = f'Enter text up to {limit} characters' + ('.' if key == 'notes' else ' and do not leave it blank.')
        else:
            fields[key] = value.strip()

    if 'quantity' in data:
        value = data['quantity']
        if type(value) is not int or not 1 <= value <= 1000000:
            errors['quantity'] = 'Enter a whole quantity from 1 through 1000000.'
        else:
            fields['quantity'] = value
    elif current is None:
        errors['quantity'] = 'Quantity is required.'

    if 'status' in data:
        if data['status'] not in PURCHASE_STATUSES:
            errors['status'] = 'Choose Pending, Ordered, Received, or Cancelled.'
        else:
            fields['status'] = data['status']
    elif current is None:
        fields['status'] = 'pending'

    for key in ('ordered_at', 'received_at'):
        if key in data:
            try:
                fields[key] = read_date(data[key])
            except ValueError as error:
                errors[key] = str(error)

    if current is not None:
        version = data.get('version')
        if type(version) is not int or version < 1:
            errors['version'] = 'Reload this purchase before saving.'
        if not (set(data) & EDITABLE_FIELDS):
            errors['fields'] = 'Send at least one editable field.'

    if errors:
        return fields, errors

    # A status change fills in missing dates. Dates remain editable for corrections.
    status = fields.get('status', current.status if current else 'pending')
    ordered = fields.get('ordered_at', current.ordered_at if current else None)
    received = fields.get('received_at', current.received_at if current else None)
    if status in ('ordered', 'received') and ordered is None:
        ordered = received or utc_now()
        fields['ordered_at'] = ordered
    if status == 'received' and received is None:
        received = utc_now()
        fields['received_at'] = received
    if received is not None and ordered is None:
        errors['ordered_at'] = 'Enter an ordered date before entering a received date.'
    elif received is not None and (
        received.replace(tzinfo=UTC).astimezone(ZoneInfo('America/Chicago')).date()
        < ordered.replace(tzinfo=UTC).astimezone(ZoneInfo('America/Chicago')).date()
    ):
        errors['received_at'] = 'Received date cannot be before ordered date.'
    return fields, errors
