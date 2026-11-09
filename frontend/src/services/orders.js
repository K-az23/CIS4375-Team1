import { apiRequest } from './api';

export async function getOrders({ signal } = {}) {
  const { orders } = await apiRequest('/hairpiece-orders', { signal });
  return orders;
}