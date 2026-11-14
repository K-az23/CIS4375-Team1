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

// Read one item when its Details / edit button is clicked.
export async function getInventoryItem(id, { signal } = {}) {
  const { item } = await apiRequest(`${path}/${encodeURIComponent(id)}`, { signal });
  return item;
}

// Ask Flask which active items have reached their reorder level.
export async function getLowStockInventory({ signal } = {}) {
  const { items } = await apiRequest(`${path}/low-stock`, { signal });
  return items;
}

// Save changes to the item description, category, and price.
export async function updateInventoryItem(id, fields) {
  const { item } = await apiRequest(`${path}/${encodeURIComponent(id)}`, { method: 'PATCH', body: fields });
  return item;
}

// Hide an item from active stock without deleting its history.
export async function deactivateInventoryItem(id) {
  const { item } = await apiRequest(`${path}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  return item;
}

// Save a signed stock correction. Flask also records it in the stock history.
export async function adjustInventoryItem(id, quantityChange) {
  const { item } = await apiRequest(`${path}/${encodeURIComponent(id)}/adjustments`, {
    method: 'POST', body: { quantity_change: quantityChange },
  });
  return item;
}

// Read both manual stock changes and appointment usage.
export async function getInventoryTransactions(id, { signal } = {}) {
  const { transactions } = await apiRequest(`${path}/${encodeURIComponent(id)}/transactions`, { signal });
  if (!Array.isArray(transactions)) throw new Error('The server returned an unexpected stock history response.');
  return transactions;
}
