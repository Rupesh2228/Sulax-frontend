import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import '../styles/pg-chpw.css';

export default function ChangePassword() {
  const [f, setF] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((current) => ({ ...current, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (f.newPassword !== f.confirmPassword) {
      setMsg({ ok: false, text: 'New password and confirmation do not match.' });
      return;
    }
    setBusy(true);
    try {
      const d = await api.put('/auth/me/password', f);
      setMsg({ ok: true, text: d.message });
      setF({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setMsg({ ok: false, text: err.message || 'Could not update your password.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pg-chpw">
      <div className="container">
        <h1>🔐 Change Password</h1>
        {msg && <div className={msg.ok ? 'success' : 'error'} role={msg.ok ? 'status' : 'alert'}>{msg.text}</div>}
        <form onSubmit={submit}>
          <label htmlFor="current-password">Current Password</label>
          <input id="current-password" type="password" maxLength={128} value={f.currentPassword} onChange={set('currentPassword')} required autoComplete="current-password" />
          <label htmlFor="new-password">New Password</label>
          <input id="new-password" type="password" value={f.newPassword} onChange={set('newPassword')} minLength={8} maxLength={128} pattern="(?=.*[A-Za-z])(?=.*[0-9]).{8,128}" title="Use at least 8 characters, including a letter and a number." required autoComplete="new-password" />
          <label htmlFor="confirm-password">Confirm New Password</label>
          <input id="confirm-password" type="password" value={f.confirmPassword} onChange={set('confirmPassword')} minLength={8} maxLength={128} required autoComplete="new-password" />
          <button type="submit" disabled={busy}>{busy ? 'Updating…' : 'Change Password'}</button>
        </form>
        <p style={{ textAlign: 'center' }}><Link to="/account">← Back to My Account</Link></p>
      </div>
    </div>
  );
}
