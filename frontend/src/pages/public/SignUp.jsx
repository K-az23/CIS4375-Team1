import { Link, useNavigate } from 'react-router-dom';

export default function SignUp() {
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();
    navigate('/account', { state: { newAccount: true } });
  }

  return (
    <section className="auth">
      <div className="auth__card auth__card--wide">
        <div className="auth__head">
          <span className="eyebrow">New client</span>
          <h1>Create your account</h1>
          <p className="muted">Save your hair system, re-order online and manage appointments.</p>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="field">
              <label htmlFor="first">First name</label>
              <input id="first" required />
            </div>
            <div className="field">
              <label htmlFor="last">Last name</label>
              <input id="last" required />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input id="email" type="email" required />
            </div>
            <div className="field">
              <label htmlFor="phone">Mobile number</label>
              <input id="phone" type="tel" required />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" type="password" minLength={8} required />
            </div>
            <div className="field">
              <label htmlFor="confirm">Confirm password</label>
              <input id="confirm" type="password" minLength={8} required />
            </div>
          </div>
          <p className="field-hint">Use the same email you book with in Setmore so your appointments show up here.</p>
          <button type="submit" className="btn btn-dark btn-block">Create account</button>
        </form>

        <p className="auth__switch">Already have an account? <Link to="/login">Log in</Link></p>
      </div>
    </section>
  );
}