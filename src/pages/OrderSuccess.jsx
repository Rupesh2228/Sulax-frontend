import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api, money } from '../api.js';
import LoadingScreen from '../components/LoadingScreen.jsx';
import '../styles/pg-success.css';

export default function OrderSuccess() {
  const { id } = useParams();
  const { state } = useLocation();
  const [order, setOrder] = useState(state?.order || null);
  const [loading, setLoading] = useState(!state?.order);
  const [error, setError] = useState('');

  useEffect(() => {
    if (order) return;
    let active = true;
    setLoading(true);
    setError('');
    api.get(`/orders/${id}`)
      .then((d) => { if (active) setOrder(d.order); })
      .catch((err) => { if (active) setError(err.message || 'Could not load this order.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, order]);

  if (loading) return <LoadingScreen message="Loading your order..." />;

  return (
    <div className="pg-success">
      <div className="order-success">
        {error ? (
          <>
            <h1>We could not load your order</h1>
            <p role="alert">{error}</p>
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
