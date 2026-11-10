import { apiRequest } from './api';

export async function getCatalogItems({ signal } = {}) {
  const { items } = await apiRequest('/catalog', { signal });
  return items;
}