import { apiRequest } from './api';

export const catalogKeys = {
  hair_type: 'hairType', base_type: 'baseType', skin_thickness: 'skinThickness',
  color: 'color', grey_percent: 'greyPercent', density: 'density', dimensions: 'dimensions',
};

function checkOptions(options) {
  for (const name of Object.keys(catalogKeys)) {
    if (!Array.isArray(options?.[name]) || options[name].length === 0 ||
        !options[name].every((value) => name === 'grey_percent'
          ? Number.isInteger(value) && value >= 0 && value <= 100
          : typeof value === 'string' && value.trim())) {
      throw new Error('The server returned invalid hair options.');
    }
  }
}

function checkCatalog(data) {
  checkOptions(data?.options);
  const types = data?.system_types;
  if (!Array.isArray(data?.items) || !Array.isArray(types) ||
      !['area', 'full'].every((key) => types.some((item) => item.key === key && Number.isFinite(item.price) && item.price >= 0)) ||
      !Number.isInteger(data.shipping_days) || data.shipping_days < 1) {
    throw new Error('The server returned an invalid catalog.');
  }
  return data;
}

export async function getCatalog({ signal } = {}) {
  return checkCatalog(await apiRequest('/catalog', { signal }));
}

export async function getCatalogItems(options = {}) {
  const { items } = await getCatalog(options);
  return items;
}

export async function getCatalogItem(id, { signal } = {}) {
  const { item } = await apiRequest(`/catalog/${encodeURIComponent(id)}`, { signal });
  return item;
}

export async function getCatalogOptions(id, { signal } = {}) {
  const data = await apiRequest(`/catalog/${encodeURIComponent(id)}/options`, { signal });
  checkOptions(data.options);
  return data;
}

// Convert the backend's option names to the names used by the existing forms.
export function formOptions(options) {
  return Object.fromEntries(Object.entries(catalogKeys).map(([apiKey, formKey]) => [formKey, options[apiKey]]));
}

export function formCatalog(data) {
  return {
    options: formOptions(data.options),
    areaPrice: data.system_types.find((item) => item.key === 'area').price,
    customFrom: data.system_types.find((item) => item.key === 'full').price,
    shippingDays: data.shipping_days,
  };
}

export async function getAdminCatalog({ signal } = {}) {
  return checkCatalog(await apiRequest('/admin/catalog', { signal }));
}

export async function getAdminCatalogItem(id, { signal } = {}) {
  const { item } = await apiRequest(`/admin/catalog/${encodeURIComponent(id)}`, { signal });
  return item;
}

export async function createCatalogItem(fields) {
  const { item } = await apiRequest('/admin/catalog', { method: 'POST', body: fields });
  return item;
}

export async function updateCatalogItem(id, fields) {
  const { item } = await apiRequest(`/admin/catalog/${encodeURIComponent(id)}`, { method: 'PATCH', body: fields });
  return item;
}

export async function deactivateCatalogItem(id, version) {
  const { item } = await apiRequest(`/admin/catalog/${encodeURIComponent(id)}`, { method: 'DELETE', body: { version } });
  return item;
}

export function catalogError(error) {
  const messages = Object.values(error.details || {}).filter((value) => typeof value === 'string');
  return messages.length ? messages.join(' ') : error.message;
}
