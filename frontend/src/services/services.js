import { apiRequest } from './api';

// Get the public list of active services.
export async function getServices(options = {}) {
  const data = await apiRequest('/services', options);
  return data.services;
}

// Get the details for one public service.
export async function getService(serviceId, options = {}) {
  const id = encodeURIComponent(serviceId);
  const data = await apiRequest(`/services/${id}`, options);

  return data.service;
}

// Admins can see inactive services too. The page decides which rows to show.
export async function getAdminServices({ signal } = {}) {
  const data = await apiRequest(
    '/admin/services?include_inactive=true',
    { signal }
  );

  if (!Array.isArray(data.services)) {
    throw new Error('The server returned an invalid services list.');
  }

  return data.services;
}

export async function createService(fields) {
  const data = await apiRequest('/admin/services', {
    method: 'POST',
    body: fields,
  });

  return data.service;
}

export async function updateService(id, fields) {
  const data = await apiRequest(
    `/admin/services/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: fields,
    }
  );

  return data.service;
}

// Flask marks the service inactive instead of deleting its history.
export async function deactivateService(id) {
  const data = await apiRequest(
    `/admin/services/${encodeURIComponent(id)}`,
    { method: 'DELETE' }
  );

  return data.service;
}

// Turn Flask's field names into readable form error messages.
export function serviceError(error) {
  const labels = {
    service_name: 'Name',
    description: 'Description',
    duration_minutes: 'Duration',
    price: 'Price',
    setmore_service_id: 'Setmore ID',
  };

  const details = Object.entries(error.details || {})
    .filter(([, value]) => typeof value === 'string')
    .map(([name, value]) => `${labels[name] || name}: ${value}`);

  return details.length ? details.join(' ') : error.message;
}