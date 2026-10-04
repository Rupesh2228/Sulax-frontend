import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, money } from '../api.js';
import { shortId } from './MyOrders.jsx';
import { OrderSkeleton } from '../components/Skeletons.jsx';
import useDelayedLoading from '../hooks/useDelayedLoading.js';
import '../styles/pg-order.css';

export default function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const showLoading = useDelayedLoading(loading);

  useEffect(() => {
    let active = true;
    setOrder(null);
    setError('');
    setLoading(true);
    api.get(`/orders/${id}`)
      .then((d) => { if (active) setOrder(d.order); })
      .catch((err) => { if (active) setError(err.message || 'Could not load this order.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, attempt]);

  if (error) return <div className="pg-order"><div className="container"><p role="alert">{error}</p><button className="link-button" type="button" onClick={() => setAttempt((value) => value + 1)}>Retry</button><p><Link to="/my-orders">← My Orders</Link></p></div></div>;
  if (!order || order._id !== id) return showLoading ? <div className="pg-order"><div className="container"><OrderSkeleton /></div></div> : null;

  return (
    <div className="pg-order">
      <div className="container">
        <p><Link to="/my-orders">← My Orders</Link></p>
        <h1>Order {shortId(order._id)}</h1>
        <div className="box">
          <h2>Order Information</h2>
          <p><strong>Customer:</strong> {order.customerName}</p>
          <p><strong>Phone:</strong> {order.phone}</p>
          <p><strong>Address:</strong> <span style={{ whiteSpace: 'pre-line' }}>{order.address}</span></p>
          <p><strong>Payment:</strong> {order.paymentMethod}</p>
          <p><strong>Status:</strong> <span className="status">{order.status}</span></p>
          <p><strong>Order Date:</strong> {new Date(order.createdAt).toLocaleString('en-GB')}</p>
        </div>
        <div className="box">
          <h2>🛒 Ordered Products</h2>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>Product</th><th>Size</th><th>Price</th><th>Quantity</th><th>Total</th></tr></thead>
              <tbody>
                {order.items.map((i, n) => (
                  <tr key={n}>
                    <td data-label="Product"><Link to={`/product/${i.product}`}>{i.productName}</Link></td>
                    <td data-label="Size">{i.size}</td>
                    <td data-label="Price">Rs. {money(i.price)}</td>
                    <td data-label="Qty">{i.quantity}</td>
                    <td data-label="Total">Rs. {money(i.price * i.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ textAlign: 'right' }}>Delivery: Rs. {money(order.deliveryCharge)}</p>
          <h2 style={{ textAlign: 'right' }}>Total: Rs. {money(order.totalAmount)}</h2>
        </div>
      </div>
    </div>
  );
}
