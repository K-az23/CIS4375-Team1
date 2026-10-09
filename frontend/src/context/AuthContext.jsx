import { createContext, useContext, useEffect, useState } from 'react';
import { api, ENDPOINTS } from '../api/client';

const AuthContext = createContext(null);

export const isDemoMode = import.meta.env.DEV && import.meta.env.VITE_DEMO_AUTH === 'true';

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

// Where each kind of user lands after logging in.
export function homeFor(role) {
  return role === 'owner' ? '/admin' : '/account';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true); 

  useEffect(() => {
    if (isDemoMode) {
      // Keep the demo user after a page refresh
      const saved = sessionStorage.getItem('demoRole');
      setUser(saved ? demoUsers[saved] : null);
      setChecking(false);
      return;
    }
    api(ENDPOINTS.me)
      .then((data) => setUser(toUser(data)))
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  function saveSession(data) {
    if (data.token) localStorage.setItem('token', data.token);
    const loggedIn = toUser(data);
    setUser(loggedIn);
    return loggedIn;
  }

  async function login(email, password) {
    const data = await api(ENDPOINTS.login, { method: 'POST', body: { email, password } });
    return saveSession(data);
  }

  async function register(fields) {
    const data = await api(ENDPOINTS.register, { method: 'POST', body: fields });
    return saveSession(data);
  }

  // Demo mode only: log in as 'customer' or 'owner' with one click
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
    try {
      await api(ENDPOINTS.logout, { method: 'POST' });
    } catch {
    }
    localStorage.removeItem('token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, checking, login, register, logout, loginAsDemo }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}