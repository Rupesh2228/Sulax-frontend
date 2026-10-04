import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, money } from '../../api.js';
import {
  SalesIcon,
  OrdersIcon,
  ProductsIcon,
  CustomersIcon,
  TrendUpIcon,
  AlertIcon,
  PlusIcon,
  CheckIcon,
} from '../../components/admin/AdminIcons.jsx';
import { DashboardStatsSkeleton } from '../../components/Skeletons.jsx';
import useDelayedLoading from '../../hooks/useDelayedLoading.js';

export default function AdminStats() {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const showLoading = useDelayedLoading(loading);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([api.get('/admin/stats'), api.get('/admin/orders')])
      .then(([statsData, ordersData]) => {
        if (!active) return;
        setStats(statsData);
        setOrders(ordersData.orders || []);
      })
      .catch((err) => { if (active) setError(err.message || 'Could not load dashboard data.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);

  if (loading) return showLoading ? <DashboardStatsSkeleton /> : null;
  if (error && !stats) return <div role="alert" className="admin-users-state">{error} <button className="admin-btn admin-btn-secondary" type="button" onClick={() => setAttempt((value) => value + 1)}>Retry</button></div>;

  // The API aggregates all orders; this fallback also supports older order records.
  const totalRevenue = orders.reduce((sum, o) => {
    if (o.status !== 'Cancelled') return sum + (Number(o.totalAmount ?? o.total) || 0);
    return sum;
  }, 0);
  const displayedRevenue = Number.isFinite(Number(stats?.revenue))
    ? Number(stats.revenue)
    : totalRevenue;

  // Pipeline breakdown
  const pendingOrders = orders.filter((o) => o.status === 'Pending').length;
  const processingOrders = orders.filter((o) => o.status === 'Processing').length;
  const shippedOrders = orders.filter((o) => o.status === 'Shipped').length;
  const deliveredOrders = orders.filter((o) => o.status === 'Delivered').length;

  // Mock 7-day revenue performance for visual chart
  const weeklyData = [
    { day: 'Mon', height: 45, value: 'Rs. 8.2k' },
    { day: 'Tue', height: 60, value: 'Rs. 12.5k' },
    { day: 'Wed', height: 35, value: 'Rs. 6.4k' },
    { day: 'Thu', height: 80, value: 'Rs. 18.9k' },
    { day: 'Fri', height: 70, value: 'Rs. 15.1k' },
    { day: 'Sat', height: 95, value: 'Rs. 24.3k' },
    { day: 'Sun', height: 85, value: 'Rs. 20.8k' },
  ];

  return (
    <div className="slide-up">
      {/* Page Header */}
      <div className="admin-page-header">
        <div className="admin-page-title">
          <h1>Store Performance & Operations</h1>
          <p>Real-time analytics, sales telemetry, order fulfillment stages, and inventory alerts.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/sulax-itnb-admain/products" className="admin-btn admin-btn-primary">
            <PlusIcon size={16} />
            <span>Add New Product</span>
          </Link>
          <Link to="/sulax-itnb-admain/orders" className="admin-btn admin-btn-secondary">
            <span>Process Orders</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="admin-stats-grid">
        {/* Sales */}
        <div className="admin-stat-card">
          <div className="admin-stat-info">
            <h3>Gross Revenue</h3>
            <div className="admin-stat-number" style={{ color: '#f85606' }}>
              Rs. {money(displayedRevenue)}
            </div>
            <div className="admin-stat-subtext" style={{ color: '#10b981' }}>
              <TrendUpIcon size={14} />
              <span>Active store sales</span>
            </div>
          </div>
          <div className="admin-stat-icon-wrap orange">
            <SalesIcon size={22} color="#f85606" />
          </div>
        </div>

        {/* Orders */}
        <div className="admin-stat-card">
          <div className="admin-stat-info">
            <h3>Total Orders</h3>
            <div className="admin-stat-number">{stats?.orders || orders.length}</div>
            <div className="admin-stat-subtext" style={{ color: pendingOrders + processingOrders > 0 ? '#f59e0b' : '#10b981' }}>
              <span>{pendingOrders + processingOrders} awaiting fulfillment</span>
            </div>
          </div>
          <div className="admin-stat-icon-wrap blue">
            <OrdersIcon size={22} color="#3b82f6" />
          </div>
        </div>

        {/* Catalog */}
        <div className="admin-stat-card">
          <div className="admin-stat-info">
            <h3>Catalog SKUs</h3>
            <div className="admin-stat-number">{stats?.products || 0}</div>
            <div className="admin-stat-subtext" style={{ color: (stats?.lowStock?.length || 0) > 0 ? '#ef4444' : '#10b981' }}>
              {(stats?.lowStock?.length || 0) > 0 ? (
                <>
                  <AlertIcon size={14} />
                  <span>{stats.lowStock.length} items low in stock</span>
                </>
              ) : (
                <>
                  <CheckIcon size={14} />
                  <span>Healthy inventory levels</span>
                </>
              )}
            </div>
          </div>
          <div className="admin-stat-icon-wrap amber">
            <ProductsIcon size={22} color="#f59e0b" />
          </div>
        </div>

        {/* Customers */}
        <div className="admin-stat-card">
          <div className="admin-stat-info">
            <h3>Registered Buyers</h3>
            <div className="admin-stat-number">{stats?.customers || 0}</div>
            <div className="admin-stat-subtext">
              <span>Verified customer accounts</span>
            </div>
          </div>
          <div className="admin-stat-icon-wrap green">
            <CustomersIcon size={22} color="#10b981" />
          </div>
        </div>
      </div>

      {/* Visual Analytics Row: Order Fulfillment Pipeline + Weekly Revenue Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px', marginBottom: '24px' }}>
        {/* Order Fulfillment Pipeline */}
        <div className="admin-card" style={{ marginBottom: 0 }}>
          <div className="admin-card-header">
            <h3 className="admin-card-title">
              <OrdersIcon size={18} color="#f85606" />
              <span>Order Fulfillment Pipeline</span>
            </h3>
            <Link to="/sulax-itnb-admain/orders" style={{ fontSize: '0.8rem', color: '#f85606', fontWeight: 600, textDecoration: 'none' }}>
              Manage Orders →
            </Link>
          </div>
          <div className="admin-card-body">
            <div className="pipeline-grid">
              <div className={`pipeline-step ${pendingOrders > 0 ? 'active' : ''}`}>
                <div className="pipeline-step-title">Pending</div>
                <div className="pipeline-step-count" style={{ color: '#f59e0b' }}>{pendingOrders}</div>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Needs Confirmation</span>
              </div>
              <div className={`pipeline-step ${processingOrders > 0 ? 'active' : ''}`}>
                <div className="pipeline-step-title">Processing</div>
                <div className="pipeline-step-count" style={{ color: '#3b82f6' }}>{processingOrders}</div>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Packaging Shoes</span>
              </div>
              <div className="pipeline-step">
                <div className="pipeline-step-title">Shipped</div>
                <div className="pipeline-step-count" style={{ color: '#f85606' }}>{shippedOrders}</div>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>In Courier Transit</span>
              </div>
              <div className="pipeline-step">
                <div className="pipeline-step-title">Delivered</div>
                <div className="pipeline-step-count" style={{ color: '#10b981' }}>{deliveredOrders}</div>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Completed Orders</span>
              </div>
            </div>

            {/* Quick Status Bar */}
            <div style={{ marginTop: '16px', background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.82rem', color: '#334155' }}>
                <strong>Fulfillment Health:</strong> {orders.length > 0 ? Math.round((deliveredOrders / orders.length) * 100) : 100}% of orders delivered successfully.
              </div>
              <Link to="/sulax-itnb-admain/orders" className="admin-btn admin-btn-secondary admin-btn-sm">
                View Queue
              </Link>
            </div>
          </div>
        </div>

        {/* Weekly Revenue Trend Chart */}
        <div className="admin-card" style={{ marginBottom: 0 }}>
          <div className="admin-card-header">
            <h3 className="admin-card-title">
              <TrendUpIcon size={18} color="#10b981" />
              <span>Weekly Sales Volume</span>
            </h3>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#10b981', background: '#ecfdf5', padding: '2px 8px', borderRadius: '12px' }}>
              +14.2% Growth
            </span>
          </div>
          <div className="admin-card-body">
            <div className="chart-bars-wrap">
              {weeklyData.map((bar) => (
                <div key={bar.day} className="chart-bar-col">
                  <div
                    className="chart-bar-fill"
                    style={{ height: `${bar.height}%` }}
                    title={`${bar.day}: ${bar.value}`}
                  ></div>
                  <span className="chart-bar-label">{bar.day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Recent Transactions + Low Stock Alert */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px' }}>
        {/* Recent Orders Table */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">
              <OrdersIcon size={18} color="#334155" />
              <span>Recent Transactions</span>
            </h3>
            <Link to="/sulax-itnb-admain/orders" style={{ fontSize: '0.8rem', color: '#f85606', fontWeight: 600, textDecoration: 'none' }}>
              All Orders →
            </Link>
          </div>
          <div className="admin-table-wrap">
            {orders.length === 0 ? (
              <div style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>No orders placed yet.</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Invoice ID</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 5).map((o) => (
                    <tr key={o._id}>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>#{o._id.slice(-6).toUpperCase()}</td>
                      <td>{o.user?.name || o.name || 'Customer'}</td>
                      <td>
                        <strong style={{ color: '#f85606' }}>Rs. {money(o.totalAmount ?? o.total)}</strong>
                      </td>
                      <td>
                        <span
                          className={`admin-pill ${
                            o.status === 'Delivered'
                              ? 'pill-success'
                              : o.status === 'Cancelled'
                              ? 'pill-danger'
                              : o.status === 'Shipped'
                              ? 'pill-orange'
                              : 'pill-warning'
                          }`}
                        >
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Low Stock Watchlist */}
        <div>
          <div className="admin-card">
            <div className="admin-card-header">
              <h3 className="admin-card-title" style={{ color: (stats?.lowStock?.length || 0) > 0 ? '#ef4444' : '#0f172a' }}>
                <AlertIcon size={18} color={(stats?.lowStock?.length || 0) > 0 ? '#ef4444' : '#64748b'} />
                <span>Inventory Critical Watchlist ({stats?.lowStock?.length || 0})</span>
              </h3>
              <Link to="/sulax-itnb-admain/products" style={{ fontSize: '0.8rem', color: '#f85606', fontWeight: 600, textDecoration: 'none' }}>
                Restock →
              </Link>
            </div>
            <div className="admin-card-body" style={{ padding: '12px 18px' }}>
              {!stats?.lowStock || stats.lowStock.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: '#10b981', fontSize: '0.88rem' }}>
                  ✓ All products have safe inventory stock levels.
                </div>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {stats.lowStock.map((p) => (
                    <li
                      key={p._id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 0',
                        borderBottom: '1px solid #f1f5f9',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' }}>{p.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>ID: {p._id.slice(-6)}</div>
                      </div>
                      <span className="admin-pill pill-danger">
                        {p.stock === 0 ? 'Out of stock' : `${p.stock} left`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
