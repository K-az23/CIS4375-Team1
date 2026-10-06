import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import ServiceTabs from '../../components/ServiceTabs';

export default function Login() {
  const navigate = useNavigate();
  const [role, setRole] = useState('customer');
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  function handleLogin(e) {
    e.preventDefault();
    navigate(role === 'owner' ? '/admin' : '/account');
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

        <div style={{ marginBottom: 20 }}>
          <ServiceTabs
            options={[{ value: 'customer', label: 'Client' }, { value: 'owner', label: 'Owner' }]}
            value={role}
            onChange={setRole}
          />
        </div>

        <form className="form" onSubmit={handleLogin}>
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input id="email" type="email" required />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" required />
          </div>
          <div>
            <button type="button" className="link-gold" onClick={() => setResetMode(true)}>Forgot your password?</button>
          </div>
          <button type="submit" className="btn btn-dark btn-block">Log in</button>
        </form>

        <p className="auth__switch">New here? <Link to="/signup">Create an account</Link></p>
      </div>
    </section>
  );
}