// Accept a server address with or without /api.
// With no address, use Vite's connection to Flask.
const serverUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const baseUrl = serverUrl.endsWith('/api') ? serverUrl : `${serverUrl}/api`;

export const SESSION_EXPIRED_EVENT = 'auth:session-expired';

export async function apiRequest(
  path,
  { method = 'GET', body, signal } = {}
) {
  const headers = {
    Accept: 'application/json',
  };

  const token = localStorage.getItem('token');

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  // Send the request to Flask.
  // Pages can cancel a request using the signal.
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });

  if (response.status === 204) {
    return null;
  }

  const responseBody = await response.text();
  let data;

  try {
    data = JSON.parse(responseBody);
  } catch {
    if (response.ok) {
      throw new Error('The server returned an unexpected response.');
    }
  }

  if (!response.ok) {
    const publicAuth = [
      '/auth/login',
      '/auth/register',
      '/auth/forgot-password',
      '/auth/reset-password',
    ];

    // Clear an expired login when a protected request returns 401.
    // A wrong password on the login form should show its normal error.
    // An older request must not clear a newer login.
    if (
      response.status === 401 &&
      token &&
      !publicAuth.includes(path.split('?')[0]) &&
      localStorage.getItem('token') === token
    ) {
      localStorage.removeItem('token');
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }

    const message = response.status >= 500
      ? 'The server is having trouble. Please try again later.'
      : data?.error ||
        data?.message ||
        data?.msg ||
        `The request failed (${response.status}).`;

    const error = new Error(message);
    error.status = response.status;
    error.details = data?.details;

    throw error;
  }

  return data;
}