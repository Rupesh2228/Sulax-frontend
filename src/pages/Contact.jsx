import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import SEO from '../components/SEO.jsx';

export default function Contact() {
  const { user } = useAuth();
  const [f, setF] = useState({ name: user?.name || '', email: user?.email || '', subject: '', message: '' });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const d = await api.post('/contact', f);
      setMsg({ ok: true, text: d.message });
      setF({ ...f, subject: '', message: '' });
    } catch (err) { setMsg({ ok: false, text: err.message }); }
    setBusy(false);
  };

  return (
    <main className="contact-container">
      <SEO page="contact" title="Contact Us | Sulax Shoes Nepal Customer Care" />
      <div className="contact-grid">
        <div className="contact-card">
          <h1>Contact Us</h1>
          <p>Have a question about our shoes, delivery or orders? Send us a message.</p>
          <div className="contact-detail"><div><strong>Address</strong><br />Kathmandu, Nepal</div></div>
          <div className="contact-detail"><div><strong>Phone</strong><br />+977-98XXXXXXXX</div></div>
          <div className="contact-detail"><div><strong>Email</strong><br />info@sulaxshoes.com</div></div>
        </div>
        <div className="contact-card">
          <h2>Send a Message</h2>
          {msg && <div className={msg.ok ? 'success-message' : 'error-message'} role="status">{msg.text}</div>}
          <form className="contact-form" onSubmit={submit}>
            <label>Name</label><input type="text" value={f.name} onChange={set('name')} required minLength={2} maxLength={100} />
            <label>Email</label><input type="email" value={f.email} onChange={set('email')} required />
            <label>Subject</label><input type="text" value={f.subject} onChange={set('subject')} required maxLength={200} />
            <label>Message</label><textarea value={f.message} onChange={set('message')} required maxLength={3000} />
            <button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send Message'}</button>
          </form>
        </div>
      </div>
    </main>
  );
}
