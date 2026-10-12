import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Info } from 'lucide-react';
import { useAuth } from '../../context/useAuth.js';
import { homeFor } from '../../context/authUtils.js';

const emptyForm = { firstName: '', lastName: '', email: '', phone: '', password: '', confirm: '' };

export default function SignUp() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  function update(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      const newUser = await register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      navigate(homeFor(newUser.role), { replace: true, state: { newAccount: true } });
    } catch (err) {
      setError(err.status === 409 ? 'An account with that email already exists.' : err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth">
      <div className="auth__card auth__card--wide">
        <div className="auth__head">
          <span className="eyebrow">New client</span>
          <h1>Create your account</h1>
          <p className="muted">Save your hair system, re-order online and manage appointments.</p>
        </div>

        {error && <p className="notice notice--warning" style={{ marginBottom: 16 }}><Info size={16} /> {error}</p>}

        <form className="form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="field">
              <label htmlFor="firstName">First name</label>
              <input id="firstName" name="firstName" required value={form.firstName} onChange={update} />
            </div>
            <div className="field">
              <label htmlFor="lastName">Last name</label>
              <input id="lastName" name="lastName" required value={form.lastName} onChange={update} />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input id="email" name="email" type="email" autoComplete="email" required value={form.email} onChange={update} />
            </div>
            <div className="field">
              <label htmlFor="phone">Mobile number</label>
              <input id="phone" name="phone" type="tel" required value={form.phone} onChange={update} />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required value={form.password} onChange={update} />
            </div>
            <div className="field">
              <label htmlFor="confirm">Confirm password</label>
              <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required value={form.confirm} onChange={update} />
            </div>
          </div>
          <p className="field-hint">Use the same email you book with in Setmore so your appointments show up here.</p>
          <button type="submit" className="btn btn-dark btn-block" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth__switch">Already have an account? <Link to="/login">Log in</Link></p>
      </div>
    </section>
  );
}