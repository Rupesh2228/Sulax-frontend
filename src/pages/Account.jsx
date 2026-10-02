import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import SEO from '../components/SEO.jsx';
import '../styles/pg-account.css';

export default function Account() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // If logged in as administrator, automatically redirect to the Admin Dashboard
  if (user?.role === 'admin') {
    return <Navigate to="/sulax-itnb-admain" replace />;
  }
  return (
    <div className="pg-account">
      <SEO page="account" robots="noindex, nofollow" title="My Account | Sulax Shoes Nepal" />
      <div className="container">
        <div className="profile">
          <div className="profile-icon">👤</div>
          <h2>Welcome, {user.name}</h2>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Phone:</strong> {user.phone}</p>
          <p><strong>Address:</strong> <span style={{ whiteSpace: 'pre-line' }}>{user.address}</span></p>
        </div>
        <div className="menu">
          <Link to="/my-orders"><span className="menu-icon">📦</span>My Orders</Link>
          <Link to="/account/edit"><span className="menu-icon">✏️</span>Edit Profile</Link>
          <Link to="/account/password"><span className="menu-icon">🔐</span>Change Password</Link>
          <Link to="/cart"><span className="menu-icon">🛒</span>My Cart</Link>
          <Link to="/wishlist"><span className="menu-icon">♡</span>Wishlist</Link>
          <a href="/" onClick={async (e) => { e.preventDefault(); await logout(); navigate('/'); }}><span className="menu-icon">🚪</span>Logout</a>
        </div>
      </div>
    </div>
  );
}
