import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api, money } from '../api.js';
import { OrderSkeleton } from '../components/Skeletons.jsx';
import useDelayedLoading from '../hooks/useDelayedLoading.js';
import '../styles/pg-success.css';

export default function OrderSuccess() {
  const { id } = useParams();
  const { state } = useLocation();
  const [order, setOrder] = useState(state?.order || null);
  const [loading, setLoading] = useState(!state?.order);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const showLoading = useDelayedLoading(loading);

  useEffect(() => {
    if (state?.order?._id === id) {
      setOrder(state.order);
      setLoading(false);
      setError('');
      return undefined;
    }
    let active = true;
    setOrder(null);
    setLoading(true);
    setError('');
    api.get(`/orders/${id}`)
      .then((d) => { if (active) setOrder(d.order); })
      .catch((err) => { if (active) setError(err.message || 'Could not load this order.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, state, attempt]);

  if (loading) return showLoading ? <div className="pg-success"><OrderSkeleton /></div> : null;
  if (!order && !error) return null;

  return (
    <div className="pg-success">
      <div className="order-success">
        {error ? (
          <>
            <h1>We could not load your order</h1>
            <p role="alert">{error}</p>
            <button type="button" className="link-button" onClick={() => setAttempt((value) => value + 1)}>Retry</button>
          </>
        ) : (
          <>
            <div className="success-icon">✓</div>
            <h1>Order Placed Successfully!</h1>
            <p>Thank you for shopping with <strong>Sulax Shoes Collection</strong>.</p>
            <p className="order-id">Your Order ID is: <strong>#{order._id.slice(-8).toUpperCase()}</strong></p>
            <p>Total Amount: <strong>Rs. {money(order.totalAmount)}</strong></p>
            <p>Payment Method: <strong>{order.paymentMethod}</strong></p>
          </>
        )}
        <Link to="/my-orders">View My Orders</Link>{' '}
        <Link to="/">Continue Shopping</Link>
      </div>
    </div>
  );
}
