import { apiRequest } from './api';

// Read the default materials saved for one service.
export async function getServiceMaterials(serviceId, { signal } = {}) {
  const data = await apiRequest(`/admin/services/${serviceId}/materials`, { signal });
  if (!Array.isArray(data?.materials)) {
    throw new Error('The server returned an unexpected materials list.');
  }
  return data.materials;
}

// Save the whole edited list. An empty list removes this service's defaults.
export async function saveServiceMaterials(serviceId, materials) {
  const data = await apiRequest(`/admin/services/${serviceId}/materials`, {
    method: 'PUT',
    body: { materials },
  });
  if (!Array.isArray(data?.materials)) {
    throw new Error('The server returned an unexpected materials list.');
  }
  return data.materials;
}
