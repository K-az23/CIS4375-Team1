import { apiRequest } from './api';

export async function getPurchases({ signal } = {}) {
  const { purchases } = await apiRequest('/admin/purchasing', { signal });
  return purchases;
}