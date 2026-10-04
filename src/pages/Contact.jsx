import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import SEO from '../components/SEO.jsx';

export default function Contact() {
  const { user } = useAuth();
  const [f, setF] = useState({ name: user?.name || '', email: user?.email || '', subject: '', message: '' });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((current) => ({ ...current, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const d = await api.post('/contact', f);
      setMsg({ ok: true, text: d.message });
      setF((current) => ({ ...current, subject: '', message: '' }));
    } catch (err) {
      setMsg({ ok: false, text: err.message || 'Could not send your message.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="contact-container">
      <SEO page="contact" title="Contact Us | Sulax Shoes Nepal Customer Care" />
      <div className="contact-grid">
        <div className="contact-card">
          <h1>Contact Us</h1>
          <p>Have a question about our shoes, delivery or orders? Send us a message.</p>
          <div className="contact-detail"><div><strong>Address</strong><br />Mangalbazar, Patan, Lalitpur</div></div>
          <div className="contact-detail"><div><strong>Phone</strong><br /><a href="tel:+9779808780888">9808780888</a></div></div>
          <div className="contact-detail"><div><strong>Email</strong><br /><a href="mailto:Sumintheguy099@gmail.com">Sumintheguy099@gmail.com</a></div></div>
        </div>
        <div className="contact-card">
          <h2>Send a Message</h2>
          {msg && <div className={msg.ok ? 'success-message' : 'error-message'} role="status">{msg.text}</div>}
          <form className="contact-form" onSubmit={submit}>
            <label htmlFor="contact-name">Name</label><input id="contact-name" type="text" autoComplete="name" value={f.name} onChange={set('name')} required minLength={2} maxLength={100} />
            <label htmlFor="contact-email">Email</label><input id="contact-email" type="email" autoComplete="email" value={f.email} onChange={set('email')} required maxLength={200} />
            <label htmlFor="contact-subject">Subject</label><input id="contact-subject" type="text" value={f.subject} onChange={set('subject')} required maxLength={200} />
            <label htmlFor="contact-message">Message</label><textarea id="contact-message" value={f.message} onChange={set('message')} required maxLength={3000} />
            <button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send Message'}</button>
          </form>
        </div>
      </div>
    </main>
  );
}
