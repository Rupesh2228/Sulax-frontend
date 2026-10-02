import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { GoogleLogin } from '@react-oauth/google';
import SEO from '../components/SEO.jsx';

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const loggedInUser = await login(email, password);
      if (loggedInUser.role === 'admin') {
        navigate('/sulax-itnb-admain', { replace: true });
        return;
      }
      // only allow in-app paths as a redirect target (prevents open-redirect)
      const to = typeof state?.from === 'string' && state.from.startsWith('/') && !state.from.startsWith('//') ? state.from : '/';
      navigate(to, { replace: true });
    } catch (err) { setError(err.message); setBusy(false); }
  };

  return (
    <div className="auth-container">
      <SEO page="home" robots="noindex, follow" title="Login | Sulax Shoes Nepal" />
      <div className="auth-box">
        <div className="auth-logo"><h1>SULAX</h1><p>SHOES COLLECTION</p></div>
        <h2>Welcome Back</h2>
        {state?.registered && <div className="success-message">Registration successful.</div>}
        {error && <div className="error-message" role="alert">{error}</div>}
        <form onSubmit={submit}>
          <label>Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" autoComplete="email" />
          <label>Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
          <button type="submit" className="auth-button" disabled={busy}>{busy ? 'Signing in…' : 'Login'}</button>
          
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin 
              onSuccess={async (credentialResponse) => {
                try {
                  const loggedInUser = await loginWithGoogle(credentialResponse.credential);
                  if (loggedInUser.role === 'admin') {
                    navigate('/sulax-itnb-admain', { replace: true });
                    return;
                  }
                  const to = typeof state?.from === 'string' && state.from.startsWith('/') && !state.from.startsWith('//') ? state.from : '/';
                  navigate(to, { replace: true });
                } catch (err) {
                  console.error('Google login error:', err);
                  setError(err.message || 'Google login failed.');
                }
              }}
              onError={(err) => {
                console.error('Google OAuth popup error:', err);
                setError('Google popup was closed or origin not authorized. Please check console.');
              }}
            />
          </div>
        </form>
        <p className="auth-bottom">Don't have an account? <Link to="/register">Create Account</Link></p>
      </div>
    </div>
  );
}
