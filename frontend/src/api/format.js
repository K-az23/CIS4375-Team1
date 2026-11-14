// Keep shared labels and formatting in one place.
// This helps customer and admin pages show information consistently.

// Some backend dates are UTC without a timezone marker.
// Add Z so the browser reads those values as UTC.
export function parseUtc(iso) {
  if (!iso) return null;
  return new Date(/[Z+]/.test(iso.slice(10)) ? iso : `${iso}Z`);
}

export function formatDate(iso) {
  const date = parseUtc(iso);
  if (!date) return '—';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const ORDER_STATUS_LABELS = {
  invoice_sent: 'Invoice due',
  pending: 'Paid',
  ordered: 'Ordered',
  received: 'Received',
  cancelled: 'Cancelled',
};

export function orderStatusLabel(status) {
  return ORDER_STATUS_LABELS[status] ?? status;
}

const PAYMENT_STATUS_LABELS = {
  pending: 'Pending',
  succeeded: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
};

export function paymentStatusLabel(status) {
  return PAYMENT_STATUS_LABELS[status] ?? status;
}

export function paymentMethodLabel(method) {
  if (method === 'card') return 'Card';
  if (method === 'cash') return 'Cash';
  return method || '—';
}

export function orderTitle(order) {
  const label = order.system_label || 'Hair system';

  return order.dimensions
    ? `${label} · ${order.dimensions}`
    : label;
}

// Match the backend's order fields to the existing frontend spec fields.
export function specsFromOrder(order) {
  return {
    hairType: order.hair_type,
    baseType: order.base_type,
    skinThickness: order.skin_type,
    color: order.color_code,
    greyPercent: order.grey_percentage,
    density: order.density,
    dimensions: order.dimensions,
  };
}

export function specsFromCatalogKeys(specs) {
  return {
    hairType: specs.hair_type,
    baseType: specs.base_type,
    skinThickness: specs.skin_thickness,
    color: specs.color,
    greyPercent: specs.grey_percent,
    density: specs.density,
    dimensions: specs.dimensions,
  };
}

// Display a stored US phone number in a familiar format.
export function formatPhone(phone) {
  const digits = (phone || '')
    .replace(/\D/g, '')
    .replace(/^1(?=\d{10}$)/, '');

  if (digits.length !== 10) return phone || '';

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

// Remove display formatting before sending the phone number to Flask.
export function phoneDigits(phone) {
  return (phone || '')
    .replace(/\D/g, '')
    .replace(/^1(?=\d{10}$)/, '');
}

// Keep the existing Checkout page's expected order format.
export function checkoutStateForOrder(order) {
  return {
    order: {
      orderId: order.order_id,
      title: order.system_label || 'Hair system',
      specs: specsFromOrder(order),
      price: order.price,
    },
  };
}

const ADMIN_ORDER_STATUS_LABELS = {
  invoice_sent: 'Invoice sent',
  pending: 'Pending',
  ordered: 'Ordered',
  received: 'Received',
  cancelled: 'Cancelled',
};

export function adminOrderStatusLabel(status) {
  return ADMIN_ORDER_STATUS_LABELS[status] ?? status;
}

export function customerName(person) {
  if (!person) return '—';
  if (person.name) return person.name;

  return (
    `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim() ||
    person.email ||
    '—'
  );
}

// Return today's date in the browser's local timezone.
export function todayIso() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');

  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// Preserve main's appointment display helper.
// Existing appointment pages keep using their tested time helpers.
const APPOINTMENT_TIMES_ARE_UTC = false;

export function parseAppointmentTime(iso) {
  if (!iso) return null;
  if (APPOINTMENT_TIMES_ARE_UTC) return parseUtc(iso);

  return new Date(iso.slice(0, 19));
}

export function formatAppointment(iso, style = 'datetime') {
  const date = parseAppointmentTime(iso);
  if (!date) return '—';

  if (style === 'time') {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  if (style === 'date') {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const APPOINTMENT_STATUS_LABELS = {
  booked: 'Confirmed',
  completed: 'Completed',
  no_show: 'No-show',
  cancelled: 'Cancelled',
};

export function appointmentStatusLabel(status) {
  return APPOINTMENT_STATUS_LABELS[status] ?? status;
}

// Return a date a certain number of days before or after today.
export function isoDaysFromToday(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);

  const pad = (n) => String(n).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}