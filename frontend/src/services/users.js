import { apiRequest } from './api';

export async function getProfile({ signal } = {}) {
  const data = await apiRequest('/users/me', { signal });
  return data.user;
}

export async function updateProfile(fields) {
  const data = await apiRequest('/users/me', { method: 'PATCH', body: fields });
  return data.user;
}

export async function getAdminCustomers({ signal } = {}) {
  const data = await apiRequest('/admin/users', { signal });
  return data.users;
}
// Read the selected customer's contact details and admin settings.
export async function getAdminCustomer(userId, { signal } = {}) {
  const data = await apiRequest(`/admin/users/${userId}`, { signal });
  if (!data?.user) throw new Error('The server returned an unexpected customer response.');
  return data.user;
}

// Save only the fields that the existing admin API allows.
export async function updateAdminCustomer(userId, fields) {
  const data = await apiRequest(`/admin/users/${userId}`, { method: 'PATCH', body: fields });
  if (!data?.user) throw new Error('The server returned an unexpected customer response.');
  return data.user;
}

// These histories are read-only. No payment or booking action is performed.
export async function getCustomerAppointments(userId, { signal } = {}) {
  const data = await apiRequest(`/admin/users/${userId}/appointments`, { signal });
  if (!Array.isArray(data?.appointments)) {
    throw new Error('The server returned an unexpected customer history response.');
  }
  return data.appointments;
}

export async function getCustomerOrders(userId, { signal } = {}) {
  const data = await apiRequest(`/admin/users/${userId}/hairpiece-orders`, { signal });
  if (!Array.isArray(data?.orders)) {
    throw new Error('The server returned an unexpected customer history response.');
  }
  return data.orders;
}

export async function getCustomerPayments(userId, { signal } = {}) {
  const data = await apiRequest(`/admin/users/${userId}/payments`, { signal });
  if (!Array.isArray(data?.payments)) {
    throw new Error('The server returned an unexpected customer history response.');
  }
  return data.payments;
}

export async function getCustomerTimeline(userId, { signal } = {}) {
  const data = await apiRequest(`/admin/users/${userId}/timeline`, { signal });
  if (!Array.isArray(data?.timeline)) {
    throw new Error('The server returned an unexpected customer history response.');
  }
  return data.timeline;
}
