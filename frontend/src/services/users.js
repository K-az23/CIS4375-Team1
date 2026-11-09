import { apiRequest } from './api';

export async function getProfile({ signal } = {}) {
  const data = await apiRequest('/users/me', { signal });
  return data.user;
}

export async function updateProfile(fields) {
  const data = await apiRequest('/users/me', { method: 'PATCH', body: fields });
  return data.user;
}