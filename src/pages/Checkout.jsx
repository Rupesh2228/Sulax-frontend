import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, imgUrl, money } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import SEO from '../components/SEO.jsx';
import '../styles/pg-checkout.css';

const DELIVERY = 100;
const profileInput = (value) => value && value !== 'Not provided' ? value : '';

export default function Checkout() {
  const { user } = useAuth();
  const { items, subtotal, clear } = useCart();
  const navigate = useNavigate();

  // Optional chaining + fallback to '' so inputs are always controlled
  // and the page never crashes if the user object is missing a field.
  const [form, setForm] = useState({
    name: profileInput(user?.name),
    phone: profileInput(user?.phone),
    address: profileInput(user?.address),
    payment: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Functional update avoids stale-state bugs from the old `{ ...form }` closure.
  const set = (key) => (e) => {
    const { value } = e.target;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (busy || items.length === 0) return; // block double submits
    setError('');
    setBusy(true);
    try {
      // Only ids / size / quantity are sent. Prices & totals are computed on the server.
      const { order } = await api.post('/orders', {
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        payment: form.payment,
        items: items.map((i) => ({
          productId: i.id,
          size: i.size,
          quantity: i.quantity,
        })),
      });
      clear();
      navigate(`/order-success/${order._id}`, { replace: true, state: { order } });
    } catch (err) {
      setError(err?.message || 'Could not place your order. Please try again.');
      setBusy(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="pg-checkout">
        <SEO page="checkout" robots="noindex, nofollow" title="Secure Checkout | Sulax Shoes Nepal" />
        <div className="checkout-container">
          <h1>Checkout</h1>
          <div className="checkout-box empty-message">
            <h2>Your cart is empty</h2>
            <p>Add some shoes before checking out.</p>
            <Link to="/" className="back-btn">Continue Shopping</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pg-checkout">
      <SEO page="checkout" robots="noindex, nofollow" title="Secure Checkout | Sulax Shoes Nepal" />
      <div className="checkout-container">
        <div className="checkout-heading">
          <p className="checkout-eyebrow">SECURE CHECKOUT</p>
          <h1>Complete your order</h1>
          <p>Confirm your delivery details and review your items before placing the order.</p>
        </div>

        <form onSubmit={submit} noValidate={false}>
          <div className="checkout-grid">
            {/* ---------- Delivery details ---------- */}
            <section className="checkout-box delivery-box" aria-labelledby="delivery-title">
              <p className="checkout-step"><span className="checkout-step-number">01</span><span className="checkout-step-label">DELIVERY DETAILS</span></p>
              <h2 id="delivery-title">Delivery Information</h2>

              <div className="delivery-fields">
                <div className="delivery-fields-row">
                  <div className="form-group">
                    <label htmlFor="co-name">Full Name</label>
                    <input
                      id="co-name"
                      type="text"
                      autoComplete="name"
                      value={form.name}
                      onChange={set('name')}
                      required
                      minLength={2}
                      maxLength={100}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="co-email">Email</label>
                    <input id="co-email" type="email" value={user?.email ?? ''} disabled readOnly />
                  </div>
                </div>

                <div className="delivery-fields-row">
                  <div className="form-group">
                    <label htmlFor="co-phone">Phone Number</label>
                    <input
                      id="co-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="98XXXXXXXX"
                      value={form.phone}
                      onChange={set('phone')}
                      required
                      minLength={7}
                      maxLength={15}
                      pattern="[0-9+\-\s]{7,15}"
                      title="Enter a valid phone number (digits, +, - and spaces only)"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="co-payment">Payment Method</label>
                    <select id="co-payment" value={form.payment} onChange={set('payment')} required>
                      <option value="">Select Payment Method</option>
                      <option value="Cash on Delivery">Cash on Delivery</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="co-address">Delivery Address</label>
                  <textarea
                    id="co-address"
                    rows={3}
                    autoComplete="street-address"
                    value={form.address}
                    onChange={set('address')}
                    required
                    minLength={5}
                    maxLength={1000}
                  />
                </div>
              </div>
            </section>

            {/* ---------- Order summary ---------- */}
            <section className="checkout-box order-box" aria-labelledby="order-title">
              <p className="checkout-step"><span className="checkout-step-number">02</span><span className="checkout-step-label">ORDER SUMMARY</span></p>
              <h2 id="order-title">Your Order</h2>

              <div className="order-items">
                {items.map((i) => (
                  <div className="cart-item" key={`${i.id}-${i.size}`}>
                    {i.image ? (
                      <img src={imgUrl(i.image)} alt={i.name} />
                    ) : (
                      <div className="cart-item-placeholder" aria-hidden="true">👟</div>
                    )}
                    <div className="cart-item-info">
                      <h3>{i.name}</h3>
                      <p className="cart-item-meta">
                        <span>Size: {i.size}</span>
                        <span>Qty: {i.quantity}</span>
                      </p>
                      <p className="cart-item-price">Rs. {money(i.price * i.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="summary-row"><span>Subtotal</span><strong>Rs. {money(subtotal)}</strong></div>
              <div className="summary-row"><span>Delivery</span><strong>Rs. {money(DELIVERY)}</strong></div>
              <div className="summary-row summary-total">
                <span>Total</span><strong>Rs. {money(subtotal + DELIVERY)}</strong>
              </div>

              {error && <p className="form-error" role="alert">{error}</p>}

              <button type="submit" className="place-order-btn" disabled={busy}>
                {busy ? 'Placing order…' : 'Place Order'}
              </button>
              <p className="order-note">Final prices are confirmed by the store when you place your order.</p>
            </section>
          </div>
        </form>
      </div>
    </div>
  );
}