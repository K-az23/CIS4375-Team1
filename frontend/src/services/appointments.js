import { apiRequest } from './api';

export const appointmentStatuses = { booked: 'Booked', completed: 'Completed', cancelled: 'Cancelled', no_show: 'No-show' };

export function appointmentTime(value) {
  if (!value) return NaN;
  return Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`);
}

export function appointmentDate(value) {
  const time = appointmentTime(value);
  return Number.isNaN(time) ? 'Time unavailable' : new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Chicago',
  }).format(time);
}

export function salonDate(offset = 0) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date());
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function appointmentError(error) {
  if (error.status === 401) return 'Your session expired. Log in again.';
  return error.message;
}

export async function getAppointments({ signal } = {}) {
  const { appointments } = await apiRequest('/appointments', { signal });
  if (!Array.isArray(appointments)) throw new Error('The server returned an invalid appointment list.');
  return appointments;
}

export async function getAppointment(id, { admin = false, signal } = {}) {
  const prefix = admin ? '/admin/appointments' : '/appointments';
  const { appointment } = await apiRequest(`${prefix}/${encodeURIComponent(id)}`, { signal });
  if (!appointment?.setmore_booking_id) throw new Error('The server returned an invalid appointment.');
  return appointment;
}

export async function getAdminAppointments({ start = '', end = '', userId = '', signal } = {}) {
  const query = new URLSearchParams();
  if (start) query.set('start', start);
  if (end) query.set('end', end);
  if (userId) query.set('user_id', userId);
  const { appointments } = await apiRequest(`/admin/appointments?${query}`, { signal });
  if (!Array.isArray(appointments)) throw new Error('The server returned an invalid appointment list.');
  return appointments;
}

export async function syncAppointments() {
  return apiRequest('/admin/appointments/sync?past_days=30&days=14', { method: 'POST' });
}

export async function finishAppointment(id, status) {
  const url = `/admin/appointments/${encodeURIComponent(id)}`;
  let data;
  if (status === 'cancelled') {
    data = await apiRequest(url, { method: 'PATCH', body: { status, confirmed_in_setmore: true } });
  } else {
    const action = status === 'completed' ? 'complete' : 'no-show';
    data = await apiRequest(`${url}/${action}`, { method: 'POST' });
  }
  return data.appointment;
}

export async function getBookingInfo({ signal } = {}) {
  const data = await apiRequest('/appointments/booking-info', { signal });
  const url = new URL(data.booking_url);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('The booking address is invalid.');
  return data;
}

export async function getOrderAppointment(orderId, { signal } = {}) {
  const { appointment } = await apiRequest(`/hairpiece-orders/${orderId}/appointment`, { signal });
  return appointment;
}

export async function linkOrderAppointment(orderId, bookingId) {
  const { appointment } = await apiRequest(`/hairpiece-orders/${orderId}/appointment`, {
    method: 'POST', body: { setmore_booking_id: bookingId },
  });
  return appointment;
}
