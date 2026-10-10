import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Check, Info } from 'lucide-react';
import { useAuth } from '../../context/useAuth.js';
import { homeFor, isDemoMode } from '../../context/authUtils.js';

export default function Login() {
  const { user, login, loginAsDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const loggedIn = await login(email, password);
      const from = location.state?.from;
      const home = homeFor(loggedIn.role);
      navigate(from && from.startsWith(home) ? from : home, { replace: true });
    } catch (err) {
      setError(err.status === 401 ? 'That email and password don\'t match.' : err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (resetMode) {
    return (
      <section className="auth">
        <div className="auth__card">
          <div className="auth__head">
            <span className="eyebrow">Account</span>
            <h1>Reset your password</h1>
            <p className="muted">We'll email you a link to choose a new password.</p>
          </div>
          {resetSent && <p className="notice" style={{ marginBottom: 16 }}><Check size={16} /> Check your email for the reset link.</p>}
          <form className="form" onSubmit={(e) => { e.preventDefault(); setResetSent(true); }}>
            <div className="field">
              <label htmlFor="reset-email">Email address</label>
              <input id="reset-email" type="email" required />
            </div>
            <button type="submit" className="btn btn-dark btn-block">Send reset link</button>
          </form>
          <p className="auth__switch">
            <button className="link-gold" onClick={() => setResetMode(false)}>Back to log in</button>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="auth">
      <div className="auth__card">
        <div className="auth__head">
          <span className="eyebrow">Welcome back</span>
          <h1>Log in</h1>
        </div>

        {/* Only shows when VITE_DEMO_AUTH=true and running locally */}
        {isDemoMode && (
          <div className="notice notice--info" style={{ marginBottom: 20, display: 'grid', gap: 10 }}>
            <span><strong>Demo mode:</strong> preview a dashboard without an account.</span>
            <div className="row">
              <button type="button" className="btn btn-dark btn-sm" onClick={() => navigate(homeFor(loginAsDemo('customer')))}>
                Client dashboard
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => navigate(homeFor(loginAsDemo('owner')))}>
                Owner dashboard
              </button>
            </div>
          </div>
        )}

        {error && <p className="notice notice--warning" style={{ marginBottom: 16 }}><Info size={16} /> {error}</p>}

        <form className="form" onSubmit={handleLogin}>
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <button type="button" className="link-gold" onClick={() => setResetMode(true)}>Forgot your password?</button>
          </div>
          <button type="submit" className="btn btn-dark btn-block" disabled={submitting}>
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="auth__switch">New here? <Link to="/signup">Create an account</Link></p>
      </div>
    </section>
  );
}