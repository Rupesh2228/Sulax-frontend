import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import '../styles/pg-profile.css';

export default function EditProfile() {
  const { user, setUser } = useAuth();
  const [f, setF] = useState({ name: user.name, phone: user.phone, address: user.address });
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    try {
      const d = await api.put('/auth/me', f);
      setUser(d.user);
      setMsg({ ok: true, text: 'Profile updated successfully!' });
    } catch (err) { setMsg({ ok: false, text: err.message }); }
  };

  return (
    <div className="pg-profile">
      <div className="container">
        <h1>✏️ Edit Profile</h1>
        {msg && <div className={msg.ok ? 'success' : 'error'} style={msg.ok ? undefined : { background: '#ffe8e8', color: 'red', padding: 10 }}>{msg.text}</div>}
        <form onSubmit={submit}>
          <label>Name</label><input type="text" value={f.name} onChange={set('name')} required minLength={2} maxLength={100} />
          <label>Email</label><input type="email" value={user.email} disabled />
          <label>Phone</label><input type="text" value={f.phone} onChange={set('phone')} required />
          <label>Address</label><textarea value={f.address} onChange={set('address')} required maxLength={1000} />
          <button type="submit">Update Profile</button>
        </form>
        <p style={{ textAlign: 'center' }}><Link to="/account">← Back to My Account</Link></p>
      </div>
    </div>
  );
}
