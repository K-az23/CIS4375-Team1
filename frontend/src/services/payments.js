import { apiRequest } from './api';

export async function getPaymentHistory({ signal } = {}) {
  const { payments } = await apiRequest('/payments', { signal });
  if (!Array.isArray(payments)) throw new Error("The server returned an invalid payments list.");
  return payments;
}

export async function getSavedPaymentMethod({ signal } = {}) {
  const { payment_method } = await apiRequest('/payments/method', { signal });
  return payment_method;
}

export async function startCardSetup() {
  const { client_secret } = await apiRequest('/payments/setup-method', { method: 'POST' });

  if (!client_secret) {
    throw new Error('The server could not start card setup.');
  }

  return client_secret;
}

export const paymentStatuses = { pending: 'Pending', succeeded: 'Paid', failed: 'Failed', cancelled: 'Cancelled', refunded: 'Refunded' };
export const paymentTypes = { service: 'Salon service', deposit: 'Deposit', cancellation_fee: 'Cancellation fee', no_show_fee: 'No-show fee', hairpiece_order: 'Hairpiece order' };

// Dates from Flask are UTC. Show them in the salon's Central Time.
export function paymentDate(value) {
  if (!value) return '—';
  const date = new Date(/(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-US', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Chicago',
  });
}

export function paymentError(error) {
  if (error.status === 401) return 'Your session expired. Log in again.';
  const details = Object.values(error.details ?? {}).filter((value) => typeof value === 'string');
  return details.length ? details.join(' ') : error.message;
}

export async function getPayment(id, { admin = false, signal } = {}) {
  const path = admin ? '/admin/payments' : '/payments';
  const { payment } = await apiRequest(`${path}/${encodeURIComponent(id)}`, { signal });
  if (!payment?.payment_id) throw new Error('The server returned an invalid payment.');
  return payment;
}

export async function getAdminPayments(filters = {}, { signal } = {}) {
  const query = new URLSearchParams();
  for (const field of ['status', 'from', 'to', 'user_id']) {
    if (filters[field]) query.set(field, filters[field]);
  }
  const { payments } = await apiRequest(`/admin/payments?${query}`, { signal });
  if (!Array.isArray(payments)) throw new Error('The server returned an invalid payments list.');
  return payments;
}

export async function refundPayment(id) {
  const { payment } = await apiRequest(`/admin/payments/${encodeURIComponent(id)}/refund`, { method: 'POST' });
  if (!payment?.payment_id) throw new Error('The server returned an invalid payment.');
  return payment;
}

export async function startOrderPayment(orderId) {
  const { client_secret } = await apiRequest('/payments/create-intent', {
    method: 'POST', body: { order_id: orderId },
  });
  if (typeof client_secret !== 'string' || !client_secret) throw new Error('The server could not start payment.');
  return client_secret;
}
