import { apiRequest } from './api';

export async function getActiveItemCategories({ signal } = {}) {
  const { categories } = await apiRequest('/admin/item-categories', { signal });
  return categories
    .filter((category) => category.is_active)
    .map((category) => category.category_name);
}