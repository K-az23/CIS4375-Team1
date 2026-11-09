import { apiRequest } from './api';

export function submitContact(fields) {
  return apiRequest('/contact', { method: 'POST', body: fields });
}