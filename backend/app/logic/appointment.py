from datetime import UTC, datetime, time, timedelta
from decimal import Decimal, InvalidOperation
from zoneinfo import ZoneInfo

from flask import current_app
from sqlalchemy import func
from ..extensions import db
from ..models import Appointment, HairpieceOrder, Role, Service, User
from ..models.order_appointment import OrderAppointment
from ..utils.phone import normalize_phone
from .setmore import SetmoreError, list_services, list_appointments

SALON_TIMEZONE = ZoneInfo('America/Chicago')


def utc_now():
    return datetime.now(UTC).replace(tzinfo=None)


def salon_day_start(day):
    return datetime.combine(day, time.min, SALON_TIMEZONE).astimezone(UTC).replace(tzinfo=None)


def parse_setmore_time(value):
    # Convert a provider timestamp to UTC before dropping its timezone.
    # Reject ambiguous times rather than quietly moving a customer's appointment.
    if not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return None
    return parsed.astimezone(UTC).replace(tzinfo=None)


def normalize_name(first_name, last_name):
    return ' '.join(f'{first_name or ""} {last_name or ""}'.lower().split())


def normalize_setmore_phone(customer):
    value = str(customer.get('cell_phone') or '').strip()
    if value.startswith('+'):
        return normalize_phone(value)
    digits = ''.join(char for char in value if char.isdigit())
    country = ''.join(char for char in str(customer.get('country_code') or '') if char.isdigit())
    if not digits:
        return None
    if country:
        if len(digits) > 10 and digits.startswith(country):
            return '+' + digits
        return '+' + country + digits
    return normalize_phone(digits)


def find_user_for_setmore_customer(customer):
    # Keep Kevin's email-first matching and phone-plus-name fallback.
    # Only an unambiguous customer account can receive a booking.
    query = db.select(User).join(Role).where(Role.name == 'customer')
    email = str(customer.get('email_id') or '').strip().lower()
    if email:
        users = db.session.execute(query.where(func.lower(User.email) == email)).scalars().all()
        if users:
            return users[0] if len(users) == 1 else None
    phone = normalize_setmore_phone(customer)
    name = normalize_name(customer.get('first_name'), customer.get('last_name'))
    if not phone or not name:
        return None
    candidates = db.session.execute(query.where(User.phone == phone)).scalars().all()
    matches = [user for user in candidates if normalize_name(user.first_name, user.last_name) == name]
    return matches[0] if len(matches) == 1 else None


def read_provider_list(result, name):
    if not isinstance(result, dict) or result.get('response') is not True:
        raise SetmoreError('Setmore did not return a successful response.')
    data = result.get('data')
    rows = data.get(name) if isinstance(data, dict) else None
    if not isinstance(rows, list) or any(not isinstance(row, dict) for row in rows):
        raise SetmoreError('Setmore returned an invalid list.')
    return rows


def fetch_all_bookings(start, end):
    # Read every page before changing the database. An interrupted sync must
    # not make missing pages look like removed appointments.
    rows = []
    cursor = None
    seen_cursors = set()
    for _page in range(50):
        params = {'cursor': cursor} if cursor else {}
        reader = current_app.config.get('SETMORE_READER')
        result = reader.list_appointments(start.isoformat(), end.isoformat(), **params) if reader else list_appointments(start.isoformat(), end.isoformat(), **params)
        rows.extend(read_provider_list(result, 'appointments'))
        data = result['data']
        cursor = result.get('cursor') or data.get('cursor')
        if not cursor:
            return rows
        if not isinstance(cursor, str) or cursor in seen_cursors:
            raise SetmoreError('Setmore returned an invalid page cursor.')
        seen_cursors.add(cursor)
    raise SetmoreError('Setmore returned too many pages. Use a smaller date range.')


def sync_service_rows(rows):
    # Reuse the service ID when a matching service already exists. That keeps
    # inventory material lists and existing appointments attached to it.
    summary = {'created': [], 'updated': [], 'unchanged': []}
    for row in rows:
        key = row.get('key')
        name = row.get('service_name')
        duration = row.get('duration')
        try:
            price = Decimal(str(row.get('cost', 0)))
        except (InvalidOperation, ValueError):
            raise SetmoreError('Setmore returned an invalid service price.') from None
        if (not isinstance(key, str) or not 1 <= len(key) <= 100 or
                not isinstance(name, str) or not name.strip() or len(name.strip()) > 100 or
                isinstance(duration, bool) or not isinstance(duration, int) or not 1 <= duration <= 600 or
                not price.is_finite() or price < 0 or price > Decimal('99999999.99') or
                price != price.quantize(Decimal('0.01'))):
            raise SetmoreError('Setmore returned invalid service information.')
        service = db.session.execute(db.select(Service).where(Service.setmore_service_id == key)).scalar_one_or_none()
        if service is None:
            service = db.session.execute(db.select(Service).where(Service.service_name == name.strip())).scalar_one_or_none()
            if service and service.setmore_service_id not in (None, '', key):
                raise SetmoreError('A service name is assigned to a different Setmore service.')
        description = row.get('description')
        values = {
            'service_name': name.strip(), 'setmore_service_id': key,
            'duration_minutes': duration, 'price': price,
            'description': str(description).strip()[:255] if description else None,
        }
        if service is None:
            db.session.add(Service(**values, is_active=True))
            summary['created'].append(name)
        elif any(getattr(service, field) != value for field, value in values.items()):
            for field, value in values.items():
                setattr(service, field, value)
            summary['updated'].append(name)
        else:
            summary['unchanged'].append(name)
    db.session.flush()
    return summary


def sync_setmore_appointments(bookings, start, end):
    summary = {'created': [], 'updated': [], 'unchanged': [], 'skipped': [], 'needs_verification': []}
    seen_ids = set()
    for booking in bookings:
        booking_id = booking.get('key')
        if not isinstance(booking_id, str) or not 1 <= len(booking_id) <= 100:
            summary['skipped'].append({'reason': 'Invalid booking ID'})
            continue
        seen_ids.add(booking_id)
        service_key = booking.get('service_key')
        service = db.session.execute(db.select(Service).where(Service.setmore_service_id == service_key)).scalar_one_or_none() if isinstance(service_key, str) and service_key else None
        appointment_time = parse_setmore_time(booking.get('start_time'))
        customer = booking.get('customer')
        if service is None or appointment_time is None or not isinstance(customer, dict):
            summary['skipped'].append({'booking_id': booking_id, 'reason': 'Missing service, customer details or timezone-aware start time'})
            continue
        user = find_user_for_setmore_customer(customer)
        email = str(customer.get('email_id') or '').strip().lower()
        name = ' '.join(f'{customer.get("first_name") or ""} {customer.get("last_name") or ""}'.split())
        values = {
            'service_id': service.service_id, 'user_id': user.user_id if user else None,
            'customer_name': name[:200] or None, 'customer_email': email[:255] or None,
            'customer_phone': (normalize_setmore_phone(customer) or '')[:25] or None,
            'appointment_time': appointment_time, 'setmore_synced': True, 'setmore_missing': False,
        }
        appointment = db.session.get(Appointment, booking_id)
        if appointment is None:
            appointment = Appointment(setmore_booking_id=booking_id, status='booked', **values)
            db.session.add(appointment)
            summary['created'].append(booking_id)
        else:
            # Completed/no-show history remains finalized after another sync.
            if appointment.status in ('completed', 'no_show'):
                for field in ('appointment_time', 'service_id', 'user_id', 'customer_name', 'customer_email', 'customer_phone'):
                    values.pop(field)
            changed = any(getattr(appointment, field) != value for field, value in values.items())
            for field, value in values.items():
                setattr(appointment, field, value)
            summary['updated' if changed else 'unchanged'].append(booking_id)
        if appointment.status == 'cancelled' and booking.get('status') in (None, 'booked', 'confirmed'):
            appointment.status = 'booked'
            if booking_id not in summary['updated']:
                summary['updated'].append(booking_id)
            if booking_id in summary['unchanged']:
                summary['unchanged'].remove(booking_id)
        if booking.get('status') in ('cancelled', 'canceled') and appointment.status == 'booked':
            appointment.status = 'cancelled'
            if booking_id not in summary['created'] and booking_id not in summary['updated']:
                summary['updated'].append(booking_id)
                if booking_id in summary['unchanged']:
                    summary['unchanged'].remove(booking_id)
    # A disappeared booking may be cancelled OR moved outside this date range.
    # Flag it for checking in Setmore instead of inventing a cancellation.
    candidates = db.session.execute(db.select(Appointment).where(
        Appointment.setmore_synced.is_(True), Appointment.status == 'booked',
        Appointment.appointment_time >= salon_day_start(start),
        Appointment.appointment_time < salon_day_start(end + timedelta(days=1)),
    )).scalars().all()
    for appointment in candidates:
        if appointment.setmore_booking_id not in seen_ids:
            appointment.setmore_missing = True
            summary['needs_verification'].append(appointment.setmore_booking_id)
    return summary


def sync_from_setmore(start, end):
    # A private local startup file may supply a mock reader for testing.
    # Normal application startup uses the existing Setmore API client.
    reader = current_app.config.get('SETMORE_READER')
    services = read_provider_list(reader.list_services() if reader else list_services(), 'services')
    bookings = fetch_all_bookings(start, end)
    # Both imports are one database transaction; routes roll it back on error.
    service_summary = sync_service_rows(services)
    appointment_summary = sync_setmore_appointments(bookings, start, end)
    db.session.commit()
    return {'services': service_summary, 'appointments': appointment_summary,
            'start_date': start.isoformat(), 'end_date': end.isoformat()}


def get_user_appointments(user_id):
    return db.session.execute(db.select(Appointment).where(Appointment.user_id == user_id)
                              .order_by(Appointment.appointment_time)).scalars().all()


def get_admin_appointments(start=None, end=None, user_id=None):
    query = db.select(Appointment).order_by(Appointment.appointment_time)
    if start:
        query = query.where(Appointment.appointment_time >= salon_day_start(start))
    if end:
        query = query.where(Appointment.appointment_time < salon_day_start(end + timedelta(days=1)))
    if user_id:
        query = query.where(Appointment.user_id == user_id)
    return db.session.execute(query).scalars().all()


def serialize_appointment(appointment, admin=False):
    service = appointment.service
    user = appointment.user
    links = db.session.execute(db.select(OrderAppointment).join(HairpieceOrder).where(
        OrderAppointment.setmore_booking_id == appointment.setmore_booking_id,
        HairpieceOrder.user_id == appointment.user_id,
    )).scalars().all() if appointment.user_id else []
    data = {
        **appointment.to_dict(),
        'appointment_time': appointment.appointment_time.isoformat() + 'Z',
        'service_name': service.service_name if service else None,
        'service': {'service_id': service.service_id, 'service_name': service.service_name,
                    'duration_minutes': service.duration_minutes, 'price': float(service.price)} if service else None,
        'setmore_missing': bool(appointment.setmore_missing),
        'linked_order_ids': [link.order_id for link in links],
    }
    if admin:
        data['customer'] = {
            'user_id': user.user_id, 'first_name': user.first_name, 'last_name': user.last_name,
            'name': f'{user.first_name} {user.last_name}', 'email': user.email, 'phone': user.phone,
        } if user else {
            'user_id': None, 'name': appointment.customer_name or 'Setmore guest',
            'email': appointment.customer_email, 'phone': appointment.customer_phone,
        }
    return data


def finalize_appointment(booking_id, status, confirmed=False):
    appointment = db.session.execute(db.select(Appointment).where(
        Appointment.setmore_booking_id == booking_id).with_for_update()).scalar_one_or_none()
    if appointment is None:
        return None, 'Appointment not found', 404
    if appointment.status != 'booked':
        return None, 'Appointment has already been finalized', 409
    if status == 'cancelled':
        if not appointment.setmore_missing or confirmed is not True:
            return None, 'Confirm this cancellation in Setmore first', 409
    elif status not in ('completed', 'no_show'):
        return None, 'Status must be completed, no_show or cancelled', 400
    elif appointment.setmore_missing or appointment.appointment_time > utc_now():
        return None, 'Only past, confirmed bookings can be completed or marked no-show', 409
    appointment.status = status
    if status == 'cancelled':
        appointment.setmore_missing = False
    if status == 'no_show' and appointment.user_id:
        # An atomic increment prevents lost counts when two bookings are finalized.
        db.session.execute(db.update(User).where(User.user_id == appointment.user_id).values(
            no_show_count=func.coalesce(User.no_show_count, 0) + 1))
    db.session.commit()
    return appointment, None, 200
