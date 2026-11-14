import { apiRequest } from './api';

const path = '/admin/purchasing';

export async function getPurchases({ signal } = {}) {
  const { purchases } = await apiRequest(path, { signal });
  return purchases;
}

// Open the saved details instead of relying on an older list row.
export async function getPurchase(id, { signal } = {}) {
  const { purchase } = await apiRequest(`${path}/${encodeURIComponent(id)}`, { signal });
  return purchase;
}

export async function createPurchase(fields) {
  const { purchase } = await apiRequest(path, { method: 'POST', body: fields });
  return purchase;
}

export async function updatePurchase(id, fields) {
  const { purchase } = await apiRequest(`${path}/${encodeURIComponent(id)}`, {
    method: 'PATCH', body: fields,
  });
  return purchase;
}
