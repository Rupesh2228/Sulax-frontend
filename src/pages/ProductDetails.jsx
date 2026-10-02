import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, imgUrl, money } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import SEO from '../components/SEO.jsx';
import LoadingScreen from '../components/LoadingScreen.jsx';
import '../styles/pg-product.css';

const SIZES = ['6', '7', '8', '9', '10', '11'];
const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

const StarRatingInput = ({ value, onChange }) => (
  <div className="star-rating-input" aria-label={`Rating ${value} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <button
        key={n}
        type="button"
        className={`star-btn${n <= value ? ' active' : ''}`}
        onClick={() => onChange(n)}
        aria-label={`${n} star${n > 1 ? 's' : ''}`}
      >
        ★
      </button>
    ))}
  </div>
);

export default function ProductDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [size, setSize] = useState('');
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState({ text: '', ok: false });

  const [rv, setRv] = useState({ reviews: [], myReview: null });
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [rvMsg, setRvMsg] = useState(null);
  const [reviewsError, setReviewsError] = useState('');

  const loadReviews = () =>
    api.get(`/products/${id}/reviews`).then((d) => {
      setRv(d);
      setReviewsError('');
      if (d.myReview) { setRating(d.myReview.rating); setComment(d.myReview.comment || ''); }
    }).catch((err) => {
      setReviewsError(err.message || 'Could not load product reviews.');
    });

  useEffect(() => {
    setData(null); setNotFound(false); setSize(''); setQty(1); setMsg({ text: '' });
    window.scrollTo(0, 0);
    api.get(`/products/${id}`).then(setData).catch(() => setNotFound(true));
  }, [id]);

  useEffect(() => { loadReviews(); }, [id, user]); // eslint-disable-line

  if (notFound) return <div className="pg-product"><main className="details-wrap"><p>Product not found.</p><Link to="/" className="back-link">← Back to Products</Link></main></div>;
  if (!data) return <LoadingScreen message="Loading product details..." />;

  const { product, related } = data;
  const stock = Math.max(0, product.stock);
  const rounded = Math.round(product.rating);

  const add = () => {
    const err = addItem(product, size, qty);
    setMsg(err ? { text: err, ok: false } : { text: 'Product added to cart!', ok: true });
    return !err;
  };
  const buyNow = () => { if (add()) navigate('/cart'); };

  const wishlist = async () => {
    if (!user) return navigate('/login', { state: { from: `/product/${id}` } });
    try { await api.post(`/wishlist/${id}`); setMsg({ text: 'Added to wishlist.', ok: true }); }
    catch (e) { setMsg({ text: e.message, ok: false }); }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/products/${id}/reviews`, { rating, comment });
      setRvMsg({ text: 'Review saved successfully.', ok: true });
      loadReviews();
      api.get(`/products/${id}`).then(setData);
    } catch (err) { setRvMsg({ text: err.message, ok: false }); }
  };

  return (
    <div className="pg-product">
      <SEO
        page="product_details"
        title={`${product.name} | Sulax Shoes Nepal`}
        description={product.description || `Buy ${product.name} at Sulax Shoes Nepal for Rs. ${product.price}. Fast cash on delivery.`}
        ogTitle={`${product.name} - Sulax Shoes`}
        ogDescription={product.description || `Buy ${product.name} at Sulax Shoes Nepal.`}
        ogImage={product.image ? imgUrl(product.image) : ''}
        schema={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.name,
          description: product.description,
          image: product.image ? imgUrl(product.image) : undefined,
          category: product.category,
          offers: {
            '@type': 'Offer',
            priceCurrency: 'NPR',
            price: product.price,
            availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          },
          aggregateRating:
            product.ratingCount > 0
              ? {
                  '@type': 'AggregateRating',
                  ratingValue: product.rating,
                  reviewCount: product.ratingCount,
                }
              : undefined,
        }}
      />
      <main className="details-wrap">
        <Link to="/" className="back-link">← Back to Products</Link>
        <section className="product-main">
          <div className="gallery">
            <div className="main-image">
              {product.image ? <img src={imgUrl(product.image)} alt={product.name} /> : <div className="image-placeholder">👟</div>}
            </div>
          </div>

          <div className="info">
            <h1>{product.name}</h1>
            <div className="meta"><span>Category: {product.category}</span><span>Product #{product._id.slice(-6)}</span></div>
            <div className="rating-stars" aria-label={`Rating ${product.rating} out of 5`}>
              {stars(rounded)}<span style={{ color: '#666', marginLeft: 7 }}>{product.rating.toFixed(1)}/5</span>
            </div>
            <div className="price-row">
              <span className="current-price">Rs. {money(product.price)}</span>
              {product.oldPrice > product.price && <span className="old-price">Rs. {money(product.oldPrice)}</span>}
              {product.discount > 0 && <span className="discount-badge">-{product.discount}%</span>}
            </div>
            <div className="section">
              <strong className={stock > 0 ? 'stock-good' : 'stock-out'}>
                {stock > 0 ? `✓ In Stock — ${stock} available` : '✕ Out of Stock'}
              </strong>
            </div>

            <div className="section">
              <h3>Select Size</h3>
              <div className="sizes">
                {SIZES.map((s) => (
                  <button key={s} type="button" className={`size-btn${size === s ? ' selected' : ''}`} onClick={() => { setSize(s); setMsg({ text: '' }); }}>{s}</button>
                ))}
              </div>
            </div>

            <div className="section">
              <h3>Quantity</h3>
              <div className="qty-box">
                <button type="button" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
                <input type="number" value={qty} min="1" max={Math.max(1, stock)} readOnly />
                <button type="button" onClick={() => setQty(Math.min(Math.max(1, stock), qty + 1))}>+</button>
              </div>
            </div>

            {msg.text && <p role="status" style={{ color: msg.ok ? '#176b2c' : '#dc3545', margin: '8px 0' }}>{msg.text}</p>}

            <div className="actions">
              <button type="button" className="buy-now" onClick={buyNow} disabled={stock <= 0}>⚡ Buy Now</button>
              <button type="button" className="add-cart" onClick={add} disabled={stock <= 0}>🛒 {stock > 0 ? 'Add to Cart' : 'Out of Stock'}</button>
              <button type="button" className="wishlist-btn" onClick={wishlist}>❤️ Wishlist</button>
            </div>

            <div className="description">
              <h2>Product Description</h2>
              {/* React escapes this text, so stored descriptions can't inject HTML/JS */}
              <p style={{ whiteSpace: 'pre-line' }}>{product.description || 'No description available.'}</p>
            </div>
          </div>
        </section>

        {related.length > 0 && (
          <section className="related">
            <h2>Related Products</h2>
            <div className="related-grid">
              {related.map((r) => (
                <article className="related-card" key={r._id}>
                  {r.image ? <img src={imgUrl(r.image)} alt={r.name} /> :
                    <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 70, background: '#f8f8f8' }}>👟</div>}
                  <div className="rc-info">
                    <h3>{r.name}</h3>
                    <div style={{ color: '#f85606' }}>⭐ {r.rating.toFixed(1)}</div>
                    <p style={{ fontWeight: 'bold' }}>Rs. {money(r.price)}</p>
                    <Link to={`/product/${r._id}`}>View Product →</Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

      <section className="reviews-section" id="reviews">
        <div className="review-layout">
          <div className="review-box">
            <h2>{rv.myReview ? 'Update Your Review' : 'Write a Review'}</h2>
            {rvMsg && <div className={`review-message${rvMsg.ok ? '' : ' review-error'}`}>{rvMsg.text}</div>}
            {!user ? <p>Please <Link to="/login" style={{ color: '#f85606', fontWeight: 600 }}>login</Link> to review this product.</p>
              : (
                <form className="review-form" onSubmit={submitReview}>
                  <p className="review-guidance">Share your thoughts before or after your purchase.</p>
                  <div className="review-rating-group">
                    <label htmlFor="review-rating">Your rating</label>
                    <StarRatingInput value={rating} onChange={setRating} />
                  </div>
                  <label htmlFor="review-comment">Your review</label>
                  <textarea id="review-comment" maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Tell us how the product felt, fit, comfort, and quality..." />
                  <button className="review-submit" type="submit">{rv.myReview ? 'Update Review' : 'Submit Review'}</button>
                </form>
              )}
          </div>

          <div className="review-list-box">
            <h2>Customer Reviews</h2>
            {reviewsError && (
              <p className="review-message review-error" role="alert">
                {reviewsError}{' '}
                <button type="button" className="link-button" onClick={loadReviews}>Retry</button>
              </p>
            )}
            {!reviewsError && rv.reviews.length === 0 && <p className="no-reviews">No reviews yet. Be the first to share your thoughts.</p>}
            {rv.reviews.map((r) => (
              <div className="review-item" key={r._id}>
                <div className="review-head">
                  <strong>{r.user?.name || 'Customer'}</strong>
                  <span className="review-date">{new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
                <div className="review-stars">{stars(r.rating)}</div>
                {r.comment && <p className="review-comment">{r.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
