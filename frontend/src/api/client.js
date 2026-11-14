import { apiRequest, SESSION_EXPIRED_EVENT } from '../services/api';

export { SESSION_EXPIRED_EVENT };

export const ENDPOINTS = {
  login: '/api/auth/login',
  register: '/api/auth/register',
  me: '/api/auth/me',
  logout: '/api/auth/logout',
  forgotPassword: '/api/auth/forgot-password',
  resetPassword: '/api/auth/reset-password',
  changePassword: '/api/auth/change-password',
};

// Keep existing pages working when their paths already include /api.
// The shared request helper adds that part of the address.
export function api(path, options) {
  return apiRequest(path.replace(/^\/api(?=\/|$)/, ''), options);
}