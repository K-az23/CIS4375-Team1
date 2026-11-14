import { useEffect, useState } from 'react';
import { api, ENDPOINTS, SESSION_EXPIRED_EVENT } from '../api/client';
import { AuthContext } from './authContext.js';
import { isDemoMode } from './authUtils.js';
import { updateProfile } from '../services/users';

const demoUsers = {
  customer: {
    id: 'demo-customer',
    firstName: 'John',
    lastName: 'Smith',
    email: 'demo-client@test.com',
    role: 'customer',
  },
  owner: {
    id: 'demo-owner',
    firstName: 'Admin',
    lastName: '',
    email: 'demo-owner@test.com',
    role: 'owner',
  },
};

const OWNER_ROLES = ['owner', 'admin'];

// Put the backend's user fields into the format our pages already use.
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

  const [checking, setChecking] = useState(!isDemoMode);

  // The API helper sends this notification when a login expires.
  // Clearing the user lets ProtectedRoute return the visitor to Log in.
  useEffect(() => {
    if (isDemoMode) return;

    function sessionExpired() {
      setUser(null);
      setChecking(false);
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, sessionExpired);

    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, sessionExpired);
    };
  }, []);

  // After a browser refresh, ask Flask whether the saved login still works.
  useEffect(() => {
    if (isDemoMode) return;

    const controller = new AbortController();

    async function restoreSession() {
      try {
        if (!localStorage.getItem('token')) return;

        const data = await api(ENDPOINTS.me, {
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setUser(toUser(data));
        }
      } catch (error) {
        if (controller.signal.aborted) return;

        if ([401, 403, 404].includes(error.status)) {
          localStorage.removeItem('token');
        }

        setUser(null);
      } finally {
        if (!controller.signal.aborted) {
          setChecking(false);
        }
      }
    }

    restoreSession();

    return () => controller.abort();
  }, []);

  async function login(email, password) {
    const data = await api(ENDPOINTS.login, {
      method: 'POST',
      body: { email, password },
    });

    const token = data?.access_token ?? data?.token;
    const loggedIn = toUser(data);

    if (!token || !loggedIn) {
      throw new Error('The server returned an incomplete login response.');
    }

    localStorage.setItem('token', token);
    setUser(loggedIn);

    return loggedIn;
  }

  // Registration creates the account, then logs the new customer in.
  async function register({
    firstName,
    lastName,
    email,
    phone,
    password,
  }) {
    await api(ENDPOINTS.register, {
      method: 'POST',
      body: {
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        password,
      },
    });

    try {
      return await login(email, password);
    } catch {
      throw new Error(
        'Your account was created. Go to Log in to sign in.'
      );
    }
  }

  // Update the saved user after their profile changes.
  // This keeps greetings and account details up to date.
  async function saveProfile(fields) {
    const profile = await updateProfile(fields);
    const savedUser = toUser(profile);

    setUser((current) =>
      savedUser && current?.id === savedUser.id
        ? savedUser
        : current
    );

    return profile;
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

    await api(ENDPOINTS.logout, {
      method: 'POST',
    }).catch(() => null);

    localStorage.removeItem('token');
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        checking,
        login,
        register,
        logout,
        loginAsDemo,
        saveProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}