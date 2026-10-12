export const isDemoMode = import.meta.env.DEV && import.meta.env.VITE_DEMO_AUTH === 'true';

export function homeFor(role) {
  return role === 'owner' ? '/admin' : '/account';
}