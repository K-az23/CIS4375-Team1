import { apiRequest } from './api';

// Read every category so the page can show active and inactive categories.
export async function getItemCategories({ signal } = {}) {
  const { categories } = await apiRequest('/admin/item-categories', { signal });
  return categories;
}

// Read one category before opening its edit form.
export async function getItemCategory(id) {
  const { category } = await apiRequest(`/admin/item-categories/${id}`);
  return category;
}

// Send the new category's name and optional description to Flask.
export async function createItemCategory(fields) {
  const { category } = await apiRequest('/admin/item-categories', {
    method: 'POST',
    body: fields,
  });
  return category;
}

// Save an edited name, description, or active status.
export async function updateItemCategory(id, fields) {
  const { category } = await apiRequest(`/admin/item-categories/${id}`, {
    method: 'PATCH',
    body: fields,
  });
  return category;
}

// Deactivate the category without deleting the inventory items linked to it.
export async function deactivateItemCategory(id) {
  const { category } = await apiRequest(`/admin/item-categories/${id}`, {
    method: 'DELETE',
  });
  return category;
}
