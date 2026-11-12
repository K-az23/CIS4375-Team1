import { useEffect, useState } from 'react';
import { api, ENDPOINTS, SESSION_EXPIRED_EVENT } from '../api/client';
import { AuthContext } from './authContext.js';
import { isDemoMode } from './authUtils.js';

const demoUsers = {
  customer: { id: 'demo-customer', firstName: 'John', lastName: 'Smith', email: 'demo-client@test.com', role: 'customer' },
  owner: { id: 'demo-owner', firstName: 'Admin', lastName: '', email: 'demo-owner@test.com', role: 'owner' },
};

const OWNER_ROLES = ['owner', 'admin'];

function toUser(data) {
  const u = data?.user ?? data;
  if (!u || (!u.id && !u.email)) return null;
  const role = String(u.role ?? 'customer').toLowerCase();
  return {
    id: u.id ?? u.user_id,
    firstName: u.firstName ?? u.first_name ?? '',
    lastName: u.lastName ?? u.last_name ?? '',
    email: u.email,
    role: OWNER_ROLES.includes(role) ? 'owner' : 'customer',
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (!isDemoMode) return null;
    const saved = sessionStorage.getItem('demoRole');
    return saved ? demoUsers[saved] : null;
  });
  // Only check the saved token on load; without one there's nothing to check.
  const [checking, setChecking] = useState(() => !isDemoMode && Boolean(localStorage.getItem('token')));

  useEffect(() => {
    if (!checking) return;
    api(ENDPOINTS.me)
      .then((data) => setUser(toUser(data)))
      .catch(() => {
        // The saved token is expired or invalid, so drop it.
        localStorage.removeItem('token');
        setUser(null);
      })
      .finally(() => setChecking(false));
  }, [checking]);

  // The API client fires this when a request comes back 401 (expired token).
  useEffect(() => {
    if (isDemoMode) return undefined;
    const onExpired = () => setUser(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  async function login(email, password) {
    const data = await api(ENDPOINTS.login, { method: 'POST', body: { email, password } });
    localStorage.setItem('token', data.access_token);
    const loggedIn = toUser(data);
    setUser(loggedIn);
    return loggedIn;
  }

  // Register doesn't return a token, so log in right after creating the account.
  async function register({ firstName, lastName, email, phone, password }) {
    await api(ENDPOINTS.register, {
      method: 'POST',
      body: {
        first_name: firstName,
        last_name: lastName,
        email,
        // The backend accepts exactly 10 digits, so drop spaces, dashes and parentheses.
        phone: phone.replace(/\D/g, ''),
        password,
      },
    });
    return login(email, password);
  }

  function loginAsDemo(role) {
    sessionStorage.setItem('demoRole', role);
    setUser(demoUsers[role]);
    return demoUsers[role];
  }

  async function logout() {
    if (isDemoMode) {
      sessionStorage.removeItem('demoRole');
      setUser(null);
      return;
    }
    await api(ENDPOINTS.logout, { method: 'POST' }).catch(() => null);
    localStorage.removeItem('token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, checking, login, register, logout, loginAsDemo }}>
      {children}
    </AuthContext.Provider>
  );
}