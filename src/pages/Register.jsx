import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import SEO from '../components/SEO.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ name: '', email: '', phone: '', address: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await register(f);          // server logs the new user in via httpOnly cookie
      navigate('/', { replace: true });
    } catch (err) { setError(err.message); setBusy(false); }
  };

  return (
    <div className="auth-container">
      <SEO page="home" robots="noindex, follow" title="Create Account | Sulax Shoes Nepal" />
      <div className="auth-box">
        <div className="auth-logo"><h1>SULAX</h1><p>SHOES COLLECTION</p></div>
        <h2>Create Account</h2>
        {error && <div className="error-message" role="alert">{error}</div>}
        <form onSubmit={submit}>
          <label>Full Name</label>
          <input type="text" required minLength={2} maxLength={100} value={f.name} onChange={set('name')} placeholder="Enter your name" autoComplete="name" />
          <label>Email</label>
          <input type="email" required value={f.email} onChange={set('email')} placeholder="Enter your email" autoComplete="email" />
          <label>Phone Number</label>
          <input type="text" required value={f.phone} onChange={set('phone')} placeholder="98XXXXXXXX" autoComplete="tel" />
          <label>Address</label>
          <textarea required maxLength={1000} value={f.address} onChange={set('address')} placeholder="Enter your address" />
          <label>Password</label>
          <input type="password" required minLength={8} value={f.password} onChange={set('password')} placeholder="8+ characters, letters and numbers" autoComplete="new-password" />
          <label>Confirm Password</label>
          <input type="password" required value={f.confirmPassword} onChange={set('confirmPassword')} placeholder="Confirm password" autoComplete="new-password" />
          <button type="submit" className="auth-button" disabled={busy}>{busy ? 'Creating…' : 'Create Account'}</button>
        </form>
        <p className="auth-bottom">Already have an account? <Link to="/login">Login</Link></p>
      </div>
    </div>
  );
}
