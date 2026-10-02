import { Link, useNavigate } from 'react-router-dom';
import { imgUrl, money } from '../api.js';
import { useCart } from '../context/CartContext.jsx';
import SEO from '../components/SEO.jsx';
import '../styles/pg-cart.css';

const DELIVERY = 100;

export default function Cart() {
  const { items, changeQty, remove, subtotal } = useCart();
  const navigate = useNavigate();

  return (
    <div className="pg-cart">
      <SEO page="cart" title="Shopping Cart | Sulax Shoes Nepal" />
      <div className="container">
        <div className="cart-heading">
          <div>
            <p className="cart-eyebrow">YOUR SELECTION</p>
            <h1>Shopping Cart</h1>
          </div>
          {items.length > 0 && <span className="cart-item-count">{items.length} {items.length === 1 ? 'item' : 'items'}</span>}
        </div>
        {items.length === 0 ? (
          <div className="cart-box empty">
            <div className="empty-cart-icon" aria-hidden="true">🛒</div>
            <h2>Your cart is empty</h2>
            <p>Add some shoes to your cart.</p>
            <Link to="/" className="shop-btn">Shop Now</Link>
          </div>
        ) : (
          <div className="cart-layout">
            <section className="cart-box cart-list" aria-label="Items in your cart">
              {items.map((item, index) => (
                <article className="cart-item" key={`${item.id}-${item.size}`}>
                  <div className="cart-product">
                    {item.image ? <img className="cart-image" src={imgUrl(item.image)} alt={item.name} />
                      : <div className="cart-image cart-image-placeholder" aria-hidden="true">👟</div>}
                    <div className="cart-product-info">
                      <h2>{item.name}</h2>
                      <p className="cart-size">Size <strong>{item.size}</strong></p>
                      <p className="cart-unit-price">Rs. {money(item.price)} <span>each</span></p>
                    </div>
                  </div>
                  <div className="cart-quantity-wrap">
                    <span className="cart-label">Quantity</span>
                    <div className="quantity" aria-label={`Quantity for ${item.name}`}>
                      <button type="button" aria-label={`Decrease quantity of ${item.name}`} onClick={() => changeQty(index, -1)}>−</button>
                      <span>{item.quantity}</span>
                      <button type="button" aria-label={`Increase quantity of ${item.name}`} onClick={() => changeQty(index, 1)}>+</button>
                    </div>
                  </div>
                  <div className="cart-line-total">
                    <span className="cart-label">Item total</span>
                    <strong>Rs. {money(item.price * item.quantity)}</strong>
                  </div>
                  <button type="button" className="remove-btn" onClick={() => remove(index)} aria-label={`Remove ${item.name} from cart`}>Remove</button>
                </article>
              ))}
              <Link to="/" className="continue-shopping">← Continue shopping</Link>
            </section>
            <aside className="summary" aria-label="Order summary">
              <h2>Order Summary</h2>
              <div className="summary-row"><span>Subtotal</span><strong>Rs. {money(subtotal)}</strong></div>
              <div className="summary-row"><span>Delivery</span><strong>Rs. {money(DELIVERY)}</strong></div>
              <div className="summary-row summary-total"><span>Total</span><strong>Rs. {money(subtotal + DELIVERY)}</strong></div>
              <p className="summary-note">Final prices are confirmed by the store when you place your order.</p>
              <a href="/checkout" className="checkout-btn" onClick={(e) => { e.preventDefault(); navigate('/checkout'); }}>Proceed to Checkout <span aria-hidden="true">→</span></a>
              <p className="secure-checkout">Secure checkout · Cash on delivery available</p>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
