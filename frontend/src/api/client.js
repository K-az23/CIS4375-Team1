const API_URL = import.meta.env.VITE_API_URL || '';

export const ENDPOINTS = {
  login: '/api/auth/login',
  register: '/api/auth/register',
  me: '/api/auth/me',
  logout: '/api/auth/logout',
  forgotPassword: '/api/auth/forgot-password',
  resetPassword: '/api/auth/reset-password',
  changePassword: '/api/auth/change-password',
};

// API_URL is empty by default: in development, Vite's proxy (vite.config.js)
// forwards /api requests to the Flask backend on port 5000.

// AuthContext listens for this to log the user out when the token expires.
export const SESSION_EXPIRED_EVENT = 'auth:session-expired';

// Turns the backend's {"error": "Validation failed", "details": {...}} into one readable line.
function errorMessage(data, status) {
  if (data.details && typeof data.details === 'object') {
    const parts = Object.values(data.details).filter(Boolean);
    if (parts.length) return parts.join(' ');
  }
  return data.message || data.error || `Request failed (${status})`;
}

export async function api(path, { method = 'GET', body } = {}) {
  const token = localStorage.getItem('token');

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // A 401 with a saved token means it expired (tokens last 30 minutes).
    if (response.status === 401 && token) {
      localStorage.removeItem('token');
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    const error = new Error(errorMessage(data, response.status));
    error.status = response.status;
    error.details = data.details;
    throw error;
  }
  return data;
}