import { apiRequest } from './api';

export async function getItemCategories({ signal } = {}) {
  const { categories } = await apiRequest('/admin/item-categories', { signal });
  return categories;
}
