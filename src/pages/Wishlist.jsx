import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, imgUrl, money } from '../api.js';
import SEO from '../components/SEO.jsx';
import LoadingScreen from '../components/LoadingScreen.jsx';
import '../styles/pg-wishlist.css';

export default function Wishlist() {
  const [products, setProducts] = useState(null);
  useEffect(() => { api.get('/wishlist').then((d) => setProducts(d.products)).catch(() => setProducts([])); }, []);

  const remove = async (id) => {
    await api.del(`/wishlist/${id}`);
    setProducts(products.filter((p) => p._id !== id));
  };

  return (
    <div className="pg-wishlist">
      <SEO page="wishlist" title="My Wishlist | Sulax Shoes Nepal" />
      <div className="wishlist-container">
        <h1>❤️ My Wishlist</h1>
        {products === null ? <LoadingScreen message="Loading your wishlist..." compact /> : products.length > 0 ? (
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
