import { Link, NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import {
  DashboardIcon,
  ProductsIcon,
  OrdersIcon,
  CustomersIcon,
  ChatIcon,
  SeoIcon,
  StorefrontIcon,
  LogoutIcon,
  ShoeIcon,
} from '../components/admin/AdminIcons.jsx';
import AdminNotificationBell from '../components/admin/AdminNotificationBell.jsx';
import '../styles/admin.css';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { unreadCount } = useSocket();
  const location = useLocation();

  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // Derive breadcrumb from current path
  const path = location.pathname;
  let pageTitle = 'Dashboard Overview';
  if (path.includes('/sulax-itnb-admain/products')) pageTitle = 'Products & Inventory';
  else if (path.includes('/sulax-itnb-admain/orders')) pageTitle = 'Orders & Fulfillment';
  else if (path.includes('/sulax-itnb-admain/customers')) pageTitle = 'Customer Directory';
  else if (path.includes('/sulax-itnb-admain/messages')) pageTitle = 'Customer Support Messaging';
  else if (path.includes('/sulax-itnb-admain/seo')) pageTitle = 'SEO & Metadata Manager';

  return (
    <div className="admin-shell">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <Link to="/sulax-itnb-admain" className="admin-brand-link">
            <div className="admin-brand-logo-icon">
              <ShoeIcon size={22} color="#ffffff" />
            </div>
            <div className="admin-brand-text">
              Sulax <span className="admin-brand-badge">Command Center</span>
            </div>
          </Link>
        </div>

        <nav className="admin-nav">
          <div className="admin-nav-heading">Store Operations</div>

          <NavLink to="/sulax-itnb-admain" end className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
            <DashboardIcon size={18} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink to="/sulax-itnb-admain/products" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
            <ProductsIcon size={18} />
            <span>Products & Stock</span>
          </NavLink>

          <NavLink to="/sulax-itnb-admain/orders" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
            <OrdersIcon size={18} />
            <span>Orders & Shipping</span>
          </NavLink>

          <NavLink to="/sulax-itnb-admain/customers" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
            <CustomersIcon size={18} />
            <span>Customers</span>
          </NavLink>

          <NavLink to="/sulax-itnb-admain/messages" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
            <ChatIcon size={18} />
            <span>Messages</span>
            {unreadCount > 0 && (
              <span
                style={{
                  marginLeft: 'auto',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: '10px',
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </NavLink>

          <div className="admin-nav-heading" style={{ marginTop: '16px' }}>Configuration</div>

          <NavLink to="/sulax-itnb-admain/seo" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
            <SeoIcon size={18} />
            <span>SEO & Meta Tags</span>
          </NavLink>
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-profile">
            <div className="admin-avatar">
              {user.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div>
              <div className="admin-user-name">{user.name || 'Admin'}</div>
              <div className="admin-user-role">Super Admin</div>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign Out"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '6px',
              borderRadius: '6px',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
          >
            <LogoutIcon size={18} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="admin-main-wrap">
        {/* Topbar */}
        <header className="admin-topbar">
          <div className="admin-breadcrumb">
            <Link to="/sulax-itnb-admain" style={{ color: 'inherit', fontWeight: 500 }}>Admin Portal</Link>
            <span style={{ color: '#cbd5e1' }}>/</span>
            <span className="active">{pageTitle}</span>
          </div>

          <div className="admin-topbar-actions">
            <AdminNotificationBell />
            <div className="admin-status-pill">
              <span className="admin-status-dot"></span>
              Live Storefront Connected
            </div>

            <Link to="/" target="_blank" rel="noopener noreferrer" className="admin-view-store-btn">
              <StorefrontIcon size={16} />
              <span>View Storefront</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>↗</span>
            </Link>
          </div>
        </header>

        {/* Dynamic Outlet */}
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
