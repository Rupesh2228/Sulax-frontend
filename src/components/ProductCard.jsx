import { Link } from 'react-router-dom';
import { imgUrl, money } from '../api.js';

export default function ProductCard({ p }) {
  return (
    <article className="product-card">
      <Link className="product-image" to={`/product/${p._id}`} aria-label={`View ${p.name}`}>
        {p.discount > 0 && <span className="discount">{p.discount}% OFF</span>}
        {p.image ? <img src={imgUrl(p.image)} alt={p.name} loading="lazy" /> : <span className="shoe-placeholder" aria-hidden="true">👟</span>}
      </Link>
      <div className="product-info">
        <p className="product-category">{p.category}</p>
        <h3><Link to={`/product/${p._id}`}>{p.name}</Link></h3>
        <p className="rating" aria-label={`Rating ${p.rating.toFixed(1)} out of 5`}>★ {p.rating.toFixed(1)}<span> / 5</span></p>
        <p className="price">Rs. {money(p.price)}</p>
        {p.oldPrice > 0 && <p className="old-price">Rs. {money(p.oldPrice)}</p>}
        <Link className="add-cart" to={`/product/${p._id}`}>View details</Link>
      </div>
    </article>
  );
}
