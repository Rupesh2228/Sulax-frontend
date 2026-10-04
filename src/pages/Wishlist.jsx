import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, imgUrl, money } from '../api.js';
import SEO from '../components/SEO.jsx';
import { ProductGridSkeleton } from '../components/Skeletons.jsx';
import useDelayedLoading from '../hooks/useDelayedLoading.js';
import '../styles/pg-wishlist.css';

export default function Wishlist() {
  const [products, setProducts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const showLoading = useDelayedLoading(loading);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.get('/wishlist')
      .then((d) => { if (active) setProducts(d.products); })
      .catch((err) => { if (active) setError(err.message || 'Could not load your wishlist.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);

  const remove = async (id) => {
    await api.del(`/wishlist/${id}`);
    setProducts((previous) => previous.filter((p) => p._id !== id));
  };

  return (
    <div className="pg-wishlist">
      <SEO page="wishlist" title="My Wishlist | Sulax Shoes Nepal" />
      <div className="wishlist-container">
        <h1>❤️ My Wishlist</h1>
        {error && <p role="alert">{error} <button className="link-button" type="button" onClick={() => setAttempt((value) => value + 1)}>Retry</button></p>}
        {products === null ? (showLoading ? <ProductGridSkeleton className="wishlist-grid" count={4} /> : null) : products.length > 0 ? (
          <div className="wishlist-grid">
            {products.map((p) => (
              <div className="wishlist-card" key={p._id}>
                {p.image ? <img src={imgUrl(p.image)} alt={p.name} /> : <div style={{ fontSize: 70, textAlign: 'center', padding: 30 }}>👟</div>}
                <div className="wishlist-info">
                  <div className="category">{p.category}</div>
                  <h3>{p.name}</h3>
                  <div className="rating">⭐ {p.rating.toFixed(1)}</div>
                  <span className="price">Rs. {money(p.price)}</span>{' '}
                  {p.oldPrice > 0 && <span className="old-price">Rs. {money(p.oldPrice)}</span>}
                  <div className="buttons">
                    <Link className="view-btn" to={`/product/${p._id}`}>View</Link>
                    <button type="button" className="remove-btn" onClick={() => remove(p._id)}>Remove</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-wishlist"><div className="heart">💔</div><h2>Your wishlist is empty</h2><Link className="shop-btn" to="/">Start Shopping</Link></div>
        )}
      </div>
    </div>
  );
}
