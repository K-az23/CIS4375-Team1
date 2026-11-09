import { apiRequest } from './api';

export async function getPaymentHistory({ signal } = {}) {
  const { payments } = await apiRequest('/payments', { signal });
  return payments;
}