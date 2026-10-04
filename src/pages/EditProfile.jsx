import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import '../styles/pg-profile.css';

export default function EditProfile() {
  const { user, setUser } = useAuth();
  const [f, setF] = useState({ name: user.name, phone: user.phone, address: user.address });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((current) => ({ ...current, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const d = await api.put('/auth/me', f);
      setUser(d.user);
      setMsg({ ok: true, text: 'Profile updated successfully!' });
    } catch (err) {
      setMsg({ ok: false, text: err.message || 'Could not update your profile.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pg-profile">
      <div className="container">
        <h1>✏️ Edit Profile</h1>
        {msg && <div className={msg.ok ? 'success' : 'error'} role={msg.ok ? 'status' : 'alert'}>{msg.text}</div>}
        <form onSubmit={submit}>
          <label htmlFor="profile-name">Name</label><input id="profile-name" autoComplete="name" type="text" value={f.name} onChange={set('name')} required minLength={2} maxLength={100} />
          <label htmlFor="profile-email">Email</label><input id="profile-email" type="email" value={user.email} disabled />
          <label htmlFor="profile-phone">Phone</label><input id="profile-phone" autoComplete="tel" inputMode="tel" type="tel" value={f.phone} onChange={set('phone')} required />
          <label htmlFor="profile-address">Address</label><textarea id="profile-address" autoComplete="street-address" value={f.address} onChange={set('address')} required maxLength={1000} />
          <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Update Profile'}</button>
        </form>
        <p style={{ textAlign: 'center' }}><Link to="/account">← Back to My Account</Link></p>
      </div>
    </div>
  );
}
