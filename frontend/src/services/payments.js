import { apiRequest } from './api';

export async function getPaymentHistory({ signal } = {}) {
  const { payments } = await apiRequest('/payments', { signal });
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