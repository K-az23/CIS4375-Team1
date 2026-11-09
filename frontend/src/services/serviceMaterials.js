import { apiRequest } from './api';

export async function getServiceMaterials(serviceId, { signal } = {}) {
  const id = encodeURIComponent(serviceId);
  const { materials } = await apiRequest(`/admin/services/${id}/materials`, { signal });
  return materials;
}