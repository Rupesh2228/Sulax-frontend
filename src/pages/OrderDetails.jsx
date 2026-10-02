import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, money } from '../api.js';
import { shortId } from './MyOrders.jsx';
import LoadingScreen from '../components/LoadingScreen.jsx';
import '../styles/pg-order.css';

export default function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api.get(`/orders/${id}`).then((d) => setOrder(d.order)).catch(() => setError('Order not found.')); }, [id]);

  if (error) return <div className="pg-order"><div className="container"><p>{error}</p><Link to="/my-orders">← My Orders</Link></div></div>;
  if (!order) return <LoadingScreen message="Loading order details..." />;

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
