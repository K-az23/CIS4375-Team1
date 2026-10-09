const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const ENDPOINTS = {
  login: '/api/auth/login',
  register: '/api/auth/register',
  me: '/api/auth/me', 
  logout: '/api/auth/logout',
};

export async function api(path, { method = 'GET', body } = {}) {
  const token = localStorage.getItem('token');

  const response = await fetch(`${API_URL}${path}`, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || data.error || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return data;
}