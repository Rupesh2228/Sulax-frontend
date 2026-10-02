import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import ProductCard from '../components/ProductCard.jsx';
import SEO from '../components/SEO.jsx';
import LoadingScreen from '../components/LoadingScreen.jsx';

export default function Home() {
  const [params, setParams] = useSearchParams();
  const search = params.get('search') || '';
  const category = params.get('category') || '';
  const sort = params.get('sort') || 'newest';

  const [categories, setCategories] = useState([]);
  const [categoriesError, setCategoriesError] = useState('');
  const [products, setProducts] = useState(null);
  const [error, setError] = useState('');
  const [categoriesAttempt, setCategoriesAttempt] = useState(0);
  const [productsAttempt, setProductsAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setCategoriesError('');
    api.get('/products/categories')
      .then((d) => { if (active) setCategories(d.categories); })
      .catch((e) => { if (active) setCategoriesError(e.message || 'Could not load product categories.'); });
    return () => { active = false; };
  }, [categoriesAttempt]);

  useEffect(() => {
    let active = true;
    setProducts(null);
    setError('');
    const q = new URLSearchParams();
    if (search) q.set('search', search);
    if (category) q.set('category', category);
    q.set('sort', sort);
    api.get(`/products?${q}`)
      .then((d) => { if (active) setProducts(d.products); })
      .catch((e) => { if (active) { setError(e.message || 'Could not load products.'); setProducts([]); } });
    return () => { active = false; };
  }, [search, category, sort, productsAttempt]);

  const catLink = (c) => { const q = new URLSearchParams(); if (c) q.set('category', c); return `/?${q}`; };
  const filtered = search || category;

  return (
    <>
      <SEO page="home" />
      <nav className="category-nav" aria-label="Shop by category">
        <div className="category-container">
          <Link to="/" className={!category ? 'active' : ''}>All Shoes</Link>
          {categories.map((c) => (
            <Link key={c} to={catLink(c)} className={category === c ? 'active' : ''} aria-current={category === c ? 'page' : undefined}>{c}</Link>
          ))}
          {categoriesError && <button className="link-button" type="button" onClick={() => setCategoriesAttempt((attempt) => attempt + 1)}>Retry categories</button>}
        </div>
      </nav>

      <main>
        <section className="hero">
          <div className="hero-content">
            <div className="hero-text">
              <p className="hero-small">SULAX SHOES COLLECTION</p>
              <h2>Find your next everyday pair.</h2>
              <p>Comfortable fits, fresh styles, and a little more confidence in every step.</p>
              <a className="shop-btn" href="#products">Shop the collection <span aria-hidden="true">→</span></a>
            </div>
            <div className="hero-shoe" aria-hidden="true"><div className="shoe-circle">👟</div></div>
          </div>
        </section>

        <section className="section products-section" id="products">
          <div className="section-title product-heading">
            <div>
              <h2>{category || (search ? 'Search results' : 'Shop all shoes')}</h2>
              <p>{products ? products.length : '…'} styles to explore</p>
            </div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <select value={sort} aria-label="Sort products"
                onChange={(e) => { const q = new URLSearchParams(params); q.set('sort', e.target.value); setParams(q); }}>
                <option value="newest">Newest</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
                <option value="rating">Top rated</option>
              </select>
              {filtered && <Link to="/">Clear filters</Link>}
            </div>
          </div>

          {categoriesError && <p className="error-message" role="status">{categoriesError}</p>}
          {error && <div className="error-message" role="alert">{error} <button className="link-button" type="button" onClick={() => setProductsAttempt((attempt) => attempt + 1)}>Retry</button></div>}
          {products === null && <LoadingScreen message="Loading shoes..." compact />}
          {products && products.length > 0 && (
            <div className="product-grid">{products.map((p) => <ProductCard key={p._id} p={p} />)}</div>
          )}
          {!error && products && products.length === 0 && (
            <div className="empty-products"><p>No shoes match those filters.</p><Link to="/">Browse all shoes</Link></div>
          )}
        </section>
      </main>
    </>
  );
}
