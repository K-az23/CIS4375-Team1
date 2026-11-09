import { apiRequest } from './api';

const path = '/admin/inventory-items';

export async function getInventory({ signal } = {}) {
  const { items } = await apiRequest(path, { signal });
  return items;
}

export async function createInventoryItem(fields) {
  const { item } = await apiRequest(path, { method: 'POST', body: fields });
  return item;
}

export async function restockInventoryItem(id, quantity) {
  const { item } = await apiRequest(`${path}/${id}/restock`, {
    method: 'POST',
    body: { quantity },
  });
  return item;
}

export async function markInventoryItemUsed(id) {
  const { item } = await apiRequest(`${path}/${id}/use`, { method: 'POST' });
  return item;
}
