import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import CustomerChatWidget from './CustomerChatWidget.jsx';

export default function Layout() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [search, setSearch] = useState(params.get('search') || '');

  useEffect(() => {
    setSearch(params.get('search') || '');
  }, [params]);

  const submit = (e) => {
    e.preventDefault();
    const q = new URLSearchParams();
    if (search.trim()) q.set('search', search.trim());
    navigate(`/?${q.toString()}`);
  };

  const doLogout = async () => { await logout(); navigate('/'); };

  return (
    <>
      <div className="top-bar">
        <div className="top-container">
          <span>Welcome to Sulax Shoes Collection</span>
          <div className="top-links">
            <Link to="/contact">Contact</Link>
            {user ? (
              <>
                {user.role === 'admin' ? (
                  <Link to="/sulax-itnb-admain" style={{ fontWeight: 'bold' }}>Admin Dashboard</Link>
                ) : (
                  <Link to="/my-orders">My Orders</Link>
                )}
                <button type="button" onClick={doLogout} className="link-button">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login">Login</Link>
                <Link to="/register">Register</Link>
              </>
            )}
          </div>
        </div>
      </div>

      <header className="navbar">
        <div className="nav-container">
          <Link to="/" className="logo">
            <span aria-hidden="true" style={{ fontSize: 38 }}>👟</span>
            <div><h1>SULAX</h1><span>SHOES COLLECTION</span></div>
          </Link>
          <form className="search-box" onSubmit={submit} role="search">
            <input type="search" value={search} maxLength={100} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search shoes and styles..." aria-label="Search products" />
            <button type="submit" aria-label="Search">⌕</button>
          </form>
          <nav className="nav-icons" aria-label="Account and shopping">
            {user ? (
              <>
                <NavLink
                  to={user.role === 'admin' ? '/sulax-itnb-admain' : '/account'}
                  className="nav-icon"
                  title={user.role === 'admin' ? 'Dashboard' : 'My Account'}
                >
                  {user.role === 'admin' ? '📊' : '👤'}
                  <span>{user.role === 'admin' ? 'Dashboard' : 'Account'}</span>
                </NavLink>
                {user.role !== 'admin' && (
                  <NavLink to="/wishlist" className="nav-icon">♡<span>Wishlist</span></NavLink>
                )}
              </>
            ) : (
              <NavLink to="/login" className="nav-icon" title="Login / Register">
                👤<span>Account</span>
              </NavLink>
            )}
            <Link to="/cart" className="nav-icon cart-icon" aria-label="Shopping cart">
              🛒<span className="cart-count" id="cartCount">{count}</span>
            </Link>
          </nav>
        </div>
      </header>

      <Outlet />

      <footer className="site-footer">
        <div className="site-footer__content">
          <div className="site-footer__brand">
            <h2>SULAX SHOES COLLECTION</h2>
            <p>Kathmandu, Nepal</p>
            <a href="tel:+9779812345678">+977-9812345678</a>
            <a href="mailto:info@sulaxshoes.com">info@sulaxshoes.com</a>
          </div>
          
          <div className="site-footer__column">
            <h3>Explore</h3>
            <Link to="/">Shop all shoes</Link>
            <Link to="/cart">Shopping cart</Link>
            <Link to={user?.role === 'admin' ? '/sulax-itnb-admain' : user ? '/account' : '/login'}>
              {user?.role === 'admin' ? 'Admin dashboard' : user ? 'My account' : 'Sign in'}
            </Link>
          </div>
          
          <div className="site-footer__column">
            <h3>Step into your style</h3>
            <p>Discover footwear for your everyday plans and special moments.</p>
            <Link to="/contact">Questions? Get in touch <span aria-hidden="true">→</span></Link>
          </div>
        </div>
        <div className="site-footer__bottom">
          <p>&copy; {new Date().getFullYear()} Sulax Shoes Collection. All rights reserved.</p>
        </div>
      </footer>

      <CustomerChatWidget />
    </>
  );
}
