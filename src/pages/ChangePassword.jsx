import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import '../styles/pg-chpw.css';

export default function ChangePassword() {
  const [f, setF] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    try {
      const d = await api.put('/auth/me/password', f);
      setMsg({ ok: true, text: d.message });
      setF({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { setMsg({ ok: false, text: err.message }); }
  };

  return (
    <div className="pg-chpw">
      <div className="container">
        <h1>🔐 Change Password</h1>
        {msg && <div className={msg.ok ? 'success' : 'error'}>{msg.text}</div>}
        <form onSubmit={submit}>
          <label>Current Password</label>
          <input type="password" value={f.currentPassword} onChange={set('currentPassword')} required autoComplete="current-password" />
          <label>New Password</label>
          <input type="password" value={f.newPassword} onChange={set('newPassword')} minLength={8} required autoComplete="new-password" />
          <label>Confirm New Password</label>
          <input type="password" value={f.confirmPassword} onChange={set('confirmPassword')} minLength={8} required autoComplete="new-password" />
          <button type="submit">Change Password</button>
        </form>
        <p style={{ textAlign: 'center' }}><Link to="/account">← Back to My Account</Link></p>
      </div>
    </div>
  );
}
