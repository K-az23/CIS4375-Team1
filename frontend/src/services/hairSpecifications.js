import { apiRequest } from './api';

const path = '/users/me/hair-specifications';

export const hairSpecificationFields = [
  ['hair_type', 'Hair type'], ['base_type', 'Base type'],
  ['skin_thickness', 'Skin thickness'], ['color', 'Color'],
  ['grey_percent', 'Grey percentage'], ['density', 'Density'], ['dimensions', 'Dimensions'],
];

function checkSpecification(item) {
  if (!Number.isInteger(item?.specification_id) || !Number.isInteger(item?.version) ||
      typeof item.name !== 'string' || !['area', 'full'].includes(item.system_type) ||
      !item.specs || typeof item.specs !== 'object' || Array.isArray(item.specs)) {
    throw new Error('The server returned invalid saved hair choices.');
  }
  return item;
}

export async function getHairSpecifications({ signal } = {}) {
  const { specifications } = await apiRequest(path, { signal });
  if (!Array.isArray(specifications)) throw new Error('The server returned an invalid saved-choice list.');
  return specifications.map(checkSpecification);
}

export async function createHairSpecification(fields) {
  const { specification } = await apiRequest(path, { method: 'POST', body: fields });
  return checkSpecification(specification);
}

export async function updateHairSpecification(id, fields) {
  const { specification } = await apiRequest(`${path}/${encodeURIComponent(id)}`, { method: 'PATCH', body: fields });
  return checkSpecification(specification);
}

// The fitted consultation system still comes from its paid order history.
export async function getConsultationSystem({ signal } = {}) {
  const { saved_system } = await apiRequest('/hairpiece-orders/saved-system', { signal });
  if (saved_system !== null && (!saved_system?.order_id || !saved_system.specs)) {
    throw new Error('The server returned an invalid consultation system.');
  }
  return saved_system;
}

export async function reorderConsultationSystem() {
  const { order } = await apiRequest('/hairpiece-orders/reorder', { method: 'POST' });
  if (!order?.order_id) throw new Error('The server returned an invalid re-order.');
  return order;
}

export function hairSpecificationRows(specs) {
  return hairSpecificationFields.map(([key, label]) => [label,
    specs?.[key] == null ? '—' : key === 'grey_percent' ? `${specs[key]}%` : specs[key],
  ]);
}

export function hairSpecificationError(error) {
  if (error.status === 401) return 'Your session expired. Log in again.';
  const messages = Object.values(error.details || {}).filter((value) => typeof value === 'string');
  return messages.length ? messages.join(' ') : error.message;
}
