// Turns backend values into what the pages show. Kept in one place so the
// customer and admin pages label things the same way.

// The backend sends naive UTC times ("2026-11-12T06:52:51"); without the Z the
// browser would read them as local time and show the wrong date late at night.
export function parseUtc(iso) {
  if (!iso) return null;
  return new Date(/[Z+]/.test(iso.slice(10)) ? iso : `${iso}Z`);
}

export function formatDate(iso) {
  const date = parseUtc(iso);
  if (!date) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(iso) {
  const date = parseUtc(iso);
  if (!date) return '—';
  return date.toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
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

// e.g. "Hair loss area system · 7 x 9"
export function orderTitle(order) {
  const label = order.system_label || 'Hair system';
  return order.dimensions ? `${label} · ${order.dimensions}` : label;
}

// Order columns from the backend -> the spec keys used by SpecList and Checkout.
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

// Saved-system specs use the catalog's snake_case keys.
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

// Phones are stored as +1XXXXXXXXXX; show them as (713) 555-0101.
export function formatPhone(phone) {
  const digits = (phone || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  if (digits.length !== 10) return phone || '';
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

// The backend accepts exactly 10 digits.
export function phoneDigits(phone) {
  return (phone || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
}

// Builds the state Checkout expects for paying an existing order (an invoice or re-order).
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

// Admin wording: "pending" means paid and waiting for Natasha to order it.
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
  return `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim() || person.email || '—';
}

// "2026-11-12" for today in the browser's time zone (the salon's, on Natasha's computer).
export function todayIso() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function formatTime(iso) {
  const date = parseUtc(iso);
  if (!date) return '—';
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
