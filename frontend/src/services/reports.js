import { apiRequest } from './api';

export async function getInventoryReport({ signal } = {}) {
  const { inventory } = await apiRequest('/admin/reports/inventory', { signal });
  return inventory;
}