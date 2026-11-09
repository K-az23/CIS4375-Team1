import { apiRequest } from './api';

export async function getAppointments({ signal } = {}) {
  const { appointments } = await apiRequest('/appointments', { signal });
  return appointments;
}