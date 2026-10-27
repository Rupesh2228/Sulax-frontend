import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import ProductCard from '../components/ProductCard.jsx';
import { CategorySkeleton, ProductGridSkeleton } from '../components/Skeletons.jsx';
import SEO from '../components/SEO.jsx';
import useDelayedLoading from '../hooks/useDelayedLoading.js';

export default function Home() {
  const [params, setParams] = useSearchParams();
  const search = params.get('search') || '';
  const category = params.get('category') || '';
  const sort = params.get('sort') || 'newest';

  const [categories, setCategories] = useState([]);
  const [categoriesError, setCategoriesError] = useState('');
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [products, setProducts] = useState(null);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsFetching, setProductsFetching] = useState(false);
  const [error, setError] = useState('');
  const [categoriesAttempt, setCategoriesAttempt] = useState(0);
  const [productsAttempt, setProductsAttempt] = useState(0);
  const [banners, setBanners] = useState([]);
  const [activeBanner, setActiveBanner] = useState(0);
  const [isBannerPlaying, setIsBannerPlaying] = useState(
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const [bannersError, setBannersError] = useState('');
  const [bannersAttempt, setBannersAttempt] = useState(0);
  const showCategoriesLoading = useDelayedLoading(categoriesLoading);
  const showProductsLoading = useDelayedLoading(productsLoading || productsFetching);

  useEffect(() => {
    let active = true;
    setBannersError('');
    api.get('/banners')
      .then((data) => {
        if (!active) return;
        setBanners(data.banners || []);
        setActiveBanner(0);
      })
      .catch((err) => {
        if (active) setBannersError(err.message || 'Could not load homepage banners.');
      });
    return () => { active = false; };
  }, [bannersAttempt]);

  useEffect(() => {
    if (banners.length < 2 || !isBannerPlaying) return undefined;
    const timer = window.setInterval(() => {
      setActiveBanner((index) => (index + 1) % banners.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [banners.length, isBannerPlaying]);

  useEffect(() => {
    let active = true;
    setCategoriesError('');
    setCategoriesLoading(true);
    api.get('/products/categories')
      .then((d) => { if (active) setCategories(d.categories); })
      .catch((e) => { if (active) setCategoriesError(e.message || 'Could not load product categories.'); })
      .finally(() => { if (active) setCategoriesLoading(false); });
    return () => { active = false; };
  }, [categoriesAttempt]);

  useEffect(() => {
    let active = true;
    setError('');
    setProductsFetching(true);
    const q = new URLSearchParams();
    if (search) q.set('search', search);
    if (category) q.set('category', category);
    q.set('sort', sort);
    api.get(`/products?${q}`)
      .then((d) => { if (active) { setProducts(d.products); setProductsLoading(false); } })
      .catch((e) => { if (active) setError(e.message || 'Could not load products.'); })
      .finally(() => {
        if (active) {
          setProductsFetching(false);
          setProductsLoading(false);
        }
      });
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
          {showCategoriesLoading ? <CategorySkeleton /> : categories.map((c) => (
            <Link key={c} to={catLink(c)} className={category === c ? 'active' : ''} aria-current={category === c ? 'page' : undefined}>{c}</Link>
          ))}
          {categoriesError && <button className="link-button" type="button" onClick={() => setCategoriesAttempt((attempt) => attempt + 1)}>Retry categories</button>}
        </div>
      </nav>

      <main>
        {(banners.length > 0 || bannersError) && (
          <section className="hero banner-carousel" aria-label="Store promotions">
            {banners.length > 0 ? (
              <>
                <div className="banner-carousel__slide">
                  {banners[activeBanner].link ? (
                    <a href={banners[activeBanner].link} aria-label={banners[activeBanner].alt || 'View promotion'}>
                      <img src={banners[activeBanner].image} alt={banners[activeBanner].alt || 'Sulax Shoes promotion'} />
                    </a>
                  ) : (
                    <img src={banners[activeBanner].image} alt={banners[activeBanner].alt || 'Sulax Shoes promotion'} />
                  )}
                </div>
                {banners.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="banner-carousel__arrow banner-carousel__arrow--previous"
                      aria-label="Show previous banner"
                      onClick={() => setActiveBanner((index) => (index - 1 + banners.length) % banners.length)}
                    >‹</button>
                    <button
                      type="button"
                      className="banner-carousel__arrow banner-carousel__arrow--next"
                      aria-label="Show next banner"
                      onClick={() => setActiveBanner((index) => (index + 1) % banners.length)}
                    >›</button>
                    <div className="banner-carousel__dots" role="group" aria-label="Choose a banner">
                      {banners.map((banner, index) => (
                        <button
                          type="button"
                          key={banner._id}
                          className={index === activeBanner ? 'is-active' : ''}
                          aria-label={`Show banner ${index + 1}`}
                          aria-current={index === activeBanner ? 'true' : undefined}
                          onClick={() => setActiveBanner(index)}
                        />
                      ))}
                      <button
                        type="button"
                        className="banner-carousel__toggle"
                        aria-label={isBannerPlaying ? 'Pause banner rotation' : 'Play banner rotation'}
                        aria-pressed={!isBannerPlaying}
                        onClick={() => setIsBannerPlaying((playing) => !playing)}
                      >{isBannerPlaying ? 'Ⅱ' : '▶'}</button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <p className="banner-carousel__error" role="status">
                {bannersError} <button className="link-button" type="button" onClick={() => setBannersAttempt((attempt) => attempt + 1)}>Retry</button>
              </p>
            )}
          </section>
        )}

        <section className="section products-section" id="products">
          <div className="section-title product-heading">
            <div>
              <h2>{category || (search ? 'Search results' : 'Shop all shoes')}</h2>
              <p>{products ? products.length : '—'} styles to explore</p>
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
          {products === null && showProductsLoading && <ProductGridSkeleton />}
          {products && products.length > 0 && (
            <div className="product-grid">{products.map((p) => <ProductCard key={p._id} p={p} />)}</div>
          )}
          {!error && !productsFetching && products && products.length === 0 && (
            <div className="empty-products"><p>No shoes match those filters.</p><Link to="/">Browse all shoes</Link></div>
          )}
        </section>
      </main>
    </>
  );
}
