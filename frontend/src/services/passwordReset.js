import { apiRequest } from './api';

// These requests work without being logged in.
export function requestPasswordReset(email) {
  return apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: {
      email: email.trim(),
    },
  });
}

export function resetPassword(token, password) {
  return apiRequest('/auth/reset-password', {
    method: 'POST',
    body: {
      token,
      password,
    },
  });
}

// Show field errors returned by Flask when they are available.
export function passwordResetError(error) {
  const details = Object.values(error.details || {})
    .filter((value) => typeof value === 'string');

  return details.length
    ? details.join(' ')
    : error.message;
}