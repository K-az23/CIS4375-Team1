import { apiRequest } from './api';

export async function getPaymentHistory({ signal } = {}) {
  const { payments } = await apiRequest('/payments', { signal });
  return payments;
}

export async function getSavedPaymentMethod({ signal } = {}) {
  const { payment_method } = await apiRequest('/payments/method', { signal });
  return payment_method;
}