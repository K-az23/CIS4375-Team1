import { apiRequest } from './api';

// Get the list of services from the backend.
export async function getServices(options = {}) {
    const data = await apiRequest('/services', options);
    return data.services;
}

// Get one service using its ID.
export async function getService(serviceId, options = {}) {
  const id = encodeURIComponent(serviceId);
  const data = await apiRequest(`/services/${id}`, options);

  return data.service;
}