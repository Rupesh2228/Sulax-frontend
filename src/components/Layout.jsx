import { useState } from 'react';
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
          <form className="search-box" onSubmit={submit}>
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

      <footer className="site-footer" style={{ backgroundColor: '#222', color: '#ccc', padding: '40px 20px', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          <div style={{ flex: '1 1 200px' }}>
            <h3 style={{ color: '#fff', marginBottom: '15px' }}>SULAX SHOES COLLECTION</h3>
            <p style={{ margin: '5px 0' }}>📍 Location: Kathmandu, Nepal</p>
            <p style={{ margin: '5px 0' }}>📞 Phone: +977-9812345678</p>
            <p style={{ margin: '5px 0' }}>✉️ Email: info@sulaxshoes.com</p>
          </div>
          
          <div style={{ flex: '1 1 200px' }}>
            <h3 style={{ color: '#fff', marginBottom: '15px' }}>Quick Links</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li style={{ marginBottom: '10px' }}><Link to="/" style={{ color: '#ccc', textDecoration: 'none' }}>Home</Link></li>
              <li style={{ marginBottom: '10px' }}><Link to="/cart" style={{ color: '#ccc', textDecoration: 'none' }}>Cart</Link></li>
              <li style={{ marginBottom: '10px' }}>
                <Link to={user?.role === 'admin' ? '/sulax-itnb-admain' : '/account'} style={{ color: '#ccc', textDecoration: 'none' }}>
                  {user?.role === 'admin' ? 'Admin Dashboard' : 'My Account'}
                </Link>
              </li>
            </ul>
          </div>
          
          <div style={{ flex: '1 1 200px' }}>
            <h3 style={{ color: '#fff', marginBottom: '15px' }}>Customer Service</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li style={{ marginBottom: '10px' }}><Link to="/my-orders" style={{ color: '#ccc', textDecoration: 'none' }}>Track Orders</Link></li>
              <li style={{ marginBottom: '10px' }}><Link to="/wishlist" style={{ color: '#ccc', textDecoration: 'none' }}>Wishlist</Link></li>
              <li style={{ marginBottom: '10px' }}>Shipping & Returns</li>
              <li style={{ marginBottom: '10px' }}>FAQ</li>
            </ul>
          </div>
        </div>
        <div style={{ textAlign: 'center', borderTop: '1px solid #444', paddingTop: '20px', fontSize: '0.9em' }}>
          <p>&copy; {new Date().getFullYear()} Sulax Shoes Collection. All rights reserved.</p>
        </div>
      </footer>

      <CustomerChatWidget />
    </>
  );
}
