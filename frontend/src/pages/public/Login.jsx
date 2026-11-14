import { useState } from 'react';
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { Check, Info } from 'lucide-react';
import { useAuth } from '../../context/useAuth.js';
import { homeFor, isDemoMode } from '../../context/authUtils.js';
import {
  requestPasswordReset,
  passwordResetError,
} from '../../services/passwordReset';

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
  const [resetEmail, setResetEmail] = useState('');
  const [resetSending, setResetSending] = useState(false);
  const [resetError, setResetError] = useState('');

  // Keep main's return-to-page behavior after login updates the user.
  // Customers returning to Checkout also keep their checkout information.
  if (user) {
    const from = location.state?.from;
    const home = homeFor(user.role);
    const checkout =
      from === '/checkout' && user.role === 'customer';

    const destination =
      from && (from.startsWith(home) || checkout)
        ? from
        : home;

    return (
      <Navigate
        to={destination}
        state={
          checkout
            ? location.state.checkoutState
            : undefined
        }
        replace
      />
    );
  }

  async function handleLogin(event) {
    event.preventDefault();

    setError('');
    setSubmitting(true);

    try {
      const loggedIn = await login(email, password);
      const from = location.state?.from;
      const home = homeFor(loggedIn.role);

      if (
        from === '/checkout' &&
        loggedIn.role === 'customer'
      ) {
        navigate('/checkout', {
          replace: true,
          state: location.state.checkoutState,
        });
      } else {
        navigate(
          from && from.startsWith(home) ? from : home,
          { replace: true }
        );
      }
    } catch (error) {
      setError(
        error.status === 401
          ? "That email and password don't match."
          : error.message
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Show confirmation only after Flask accepts the reset-email request.
  async function handleResetRequest(event) {
    event.preventDefault();

    if (resetSending) return;

    setResetSent(false);
    setResetError('');
    setResetSending(true);

    try {
      await requestPasswordReset(resetEmail);
      setResetSent(true);
    } catch (error) {
      setResetError(passwordResetError(error));
    } finally {
      setResetSending(false);
    }
  }

  if (resetMode) {
    return (
      <section className="auth">
        <div className="auth__card">
          <div className="auth__head">
            <span className="eyebrow">Account</span>
            <h1>Reset your password</h1>
            <p className="muted">
              We'll email you a link to choose a new password.
            </p>
          </div>

          {resetSent && (
            <p
              role="status"
              className="notice"
              style={{ marginBottom: 16 }}
            >
              <Check size={16} />
              If an active account exists for that email,
              check its inbox for a reset link.
            </p>
          )}

          {resetError && (
            <p
              role="alert"
              className="notice notice--warning"
            >
              {resetError}
            </p>
          )}

          <form
            className="form"
            onSubmit={handleResetRequest}
          >
            <div className="field">
              <label htmlFor="reset-email">
                Email address
              </label>

              <input
                id="reset-email"
                type="email"
                autoComplete="email"
                required
                value={resetEmail}
                onChange={(event) =>
                  setResetEmail(event.target.value)
                }
                disabled={resetSending}
              />
            </div>

            <button
              type="submit"
              className="btn btn-dark btn-block"
              disabled={resetSending}
            >
              {resetSending ? 'Sending…' : 'Send reset link'}
            </button>
          </form>

          <p className="auth__switch">
            <button
              type="button"
              className="link-gold"
              onClick={() => setResetMode(false)}
            >
              Back to log in
            </button>
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

        {/* Keep the existing optional local demo buttons. */}
        {isDemoMode && (
          <div
            className="notice notice--info"
            style={{
              marginBottom: 20,
              display: 'grid',
              gap: 10,
            }}
          >
            <span>
              <strong>Demo mode:</strong> preview a dashboard
              without an account.
            </span>

            <div className="row">
              <button
                type="button"
                className="btn btn-dark btn-sm"
                onClick={() => {
                  const demoUser = loginAsDemo('customer');
                  navigate(homeFor(demoUser.role));
                }}
              >
                Client dashboard
              </button>

              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  const demoUser = loginAsDemo('owner');
                  navigate(homeFor(demoUser.role));
                }}
              >
                Owner dashboard
              </button>
            </div>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="notice notice--warning"
            style={{ marginBottom: 16 }}
          >
            <Info size={16} />
            {error}
          </p>
        )}

        <form className="form" onSubmit={handleLogin}>
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
            />
          </div>

          <div>
            <button
              type="button"
              className="link-gold"
              onClick={() => setResetMode(true)}
            >
              Forgot your password?
            </button>
          </div>

          <button
            type="submit"
            className="btn btn-dark btn-block"
            disabled={submitting}
          >
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="auth__switch">
          New here? <Link to="/signup">Create an account</Link>
        </p>
      </div>
    </section>
  );
}