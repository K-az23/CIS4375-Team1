import { apiRequest } from './api';

const path = '/hairpiece-orders';
const adminPath = '/admin/hairpiece-orders';

export const orderStatuses = {
  invoice_sent: 'Invoice due', pending: 'Pending', ordered: 'Ordered',
  received: 'Received', cancelled: 'Cancelled',
};

// Keep every request in this file so pages use the same API helper and token.
export async function getOrders({ signal } = {}) {
  const { orders } = await apiRequest(path, { signal });
  if (!Array.isArray(orders)) throw new Error('The server returned an invalid orders list.');
  return orders;
}

export async function getOrder(id, { signal } = {}) {
  const { order } = await apiRequest(`${path}/${encodeURIComponent(id)}`, { signal });
  if (!order?.order_id) throw new Error('The server returned an invalid order.');
  return order;
}

export async function createOrder(specs, catalogItemId = null) {
  const body = { specs };
  if (catalogItemId != null) body.catalog_item_id = catalogItemId;
  const { order } = await apiRequest(path, { method: 'POST', body });
  if (!order?.order_id) throw new Error('The server returned an invalid order.');
  return order;
}

export async function cancelOrder(id) {
  const { order } = await apiRequest(`${path}/${encodeURIComponent(id)}/cancel`, { method: 'POST' });
  if (!order?.order_id) throw new Error('The server returned an invalid order.');
  return order;
}

export async function getAdminOrders({ status = '', userId = '', signal } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (userId) params.set('user_id', userId);
  const query = params.size ? `?${params}` : '';
  const { orders } = await apiRequest(`${adminPath}${query}`, { signal });
  if (!Array.isArray(orders)) throw new Error('The server returned an invalid orders list.');
  return orders;
}

export async function createInvoice(fields) {
  const { order } = await apiRequest(adminPath, { method: 'POST', body: fields });
  if (!order?.order_id) throw new Error('The server returned an invalid order.');
  return order;
}

export async function updateOrderStatus(id, status) {
  const { order } = await apiRequest(`${adminPath}/${encodeURIComponent(id)}/status`, {
    method: 'PATCH', body: { status },
  });
  if (!order?.order_id) throw new Error('The server returned an invalid order.');
  return order;
}

export async function getOrderCatalog({ signal } = {}) {
  const catalog = await apiRequest('/catalog', { signal });
  const keys = ['hair_type', 'base_type', 'skin_thickness', 'color', 'grey_percent', 'density', 'dimensions'];
  if (!Array.isArray(catalog?.system_types) ||
      !keys.every((key) => Array.isArray(catalog.options?.[key]) && catalog.options[key].length > 0)) {
    throw new Error('The server returned invalid hair options.');
  }
  return catalog;
}

// Forms show the server's field messages and keep the values for correction.
export function orderError(error) {
  if (error.status === 401) return 'Your session expired. Log in again.';
  const details = Object.values(error.details ?? {}).filter((value) => typeof value === 'string');
  return details.length ? details.join(' ') : error.message;
}

export function orderDate(value) {
  if (!value) return '—';
  const timestamp = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-US', {
    dateStyle: 'medium', timeZone: 'America/Chicago',
  });
}
