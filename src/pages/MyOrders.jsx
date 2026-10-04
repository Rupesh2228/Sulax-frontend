import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money } from '../api.js';
import SEO from '../components/SEO.jsx';
import { TableSkeleton } from '../components/Skeletons.jsx';
import useDelayedLoading from '../hooks/useDelayedLoading.js';
import '../styles/pg-orders.css';

export const shortId = (id) => '#' + id.slice(-8).toUpperCase();
const fmt = (d) => new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

export default function MyOrders() {
  const [orders, setOrders] = useState(null);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const showLoading = useDelayedLoading(loading);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setMsg(null);
    api.get('/orders')
      .then((d) => { if (active) setOrders(d.orders); })
      .catch((e) => { if (active) setMsg({ ok: false, text: e.message || 'Could not load orders.' }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);

  const cancel = async (id) => {
    if (!window.confirm('Cancel this order?')) return;
    try {
      const d = await api.post(`/orders/${id}/cancel`);
      setOrders((previous) => previous.map((o) => (o._id === id ? d.order : o)));
      setMsg({ ok: true, text: d.message });
    } catch (e) { setMsg({ ok: false, text: e.message || 'The order could not be cancelled.' }); }
  };

  return (
    <div className="pg-orders">
      <SEO page="account" robots="noindex, nofollow" title="My Orders | Sulax Shoes Nepal" />
      <div className="container">
        <h1>📦 My Orders</h1>
        {msg && <div role={msg.ok ? 'status' : 'alert'} style={{ background: msg.ok ? '#e8f7e8' : '#ffe8e8', color: msg.ok ? '#176b2c' : '#a10000', padding: 12, borderRadius: 6, marginBottom: 15 }}>
          {msg.text}
          {msg.ok === false && orders === null && <> <button className="link-button" type="button" onClick={() => setAttempt((value) => value + 1)}>Retry</button></>}
        </div>}
        {orders === null ? (showLoading ? <TableSkeleton columns={6} rows={5} /> : null) : orders.length > 0 ? (
          <div className="order-box" style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>Order ID</th><th>Date</th><th>Payment</th><th>Total</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o._id}>
                    <td data-label="Order ID">{shortId(o._id)}</td>
                    <td data-label="Date">{fmt(o.createdAt)}</td>
                    <td data-label="Payment">{o.paymentMethod}</td>
                    <td data-label="Total">Rs. {money(o.totalAmount)}</td>
                    <td data-label="Status"><span className="status">{o.status}</span></td>
                    <td data-label="Action">
                      <div className="order-actions">
                        <Link className="view-btn" to={`/my-orders/${o._id}`}>View Details</Link>
                        {o.status === 'Pending' && (
                          <button type="button" className="cancel-order-btn" onClick={() => cancel(o._id)}>Cancel</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty"><h2>📦 No Orders Yet</h2><p>You haven't placed any orders yet.</p><Link className="view-btn" to="/">Start Shopping</Link></div>
        )}
      </div>
    </div>
  );
}
