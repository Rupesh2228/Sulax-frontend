import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, money } from '../../api.js';
import { SearchIcon, OrdersIcon } from '../../components/admin/AdminIcons.jsx';

export default function AdminOrders() {
  const [searchParams] = useSearchParams();
  const requestedOrderId = searchParams.get('order');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(requestedOrderId || '');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [toast, setToast] = useState(null);
  const [removingItemIndex, setRemovingItemIndex] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    api
      .get('/admin/orders')
      .then((d) => setOrders(d.orders || []))
      .catch((err) => showToast(err.message || 'Failed to load orders', 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!requestedOrderId) return;
    setSearchTerm(requestedOrderId);
    const requestedOrder = orders.find((order) => order._id === requestedOrderId);
    if (requestedOrder) setSelectedOrder(requestedOrder);
  }, [requestedOrderId, orders]);

  const updateStatus = async (id, status) => {
    try {
      const res = await api.patch(`/admin/orders/${id}/status`, { status });
      setOrders(orders.map((o) => (o._id === id ? { ...o, status: res.order.status } : o)));
      if (selectedOrder?._id === id) {
        setSelectedOrder((prev) => ({ ...prev, status: res.order.status }));
      }
      showToast(`Order #${id.slice(-6)} status updated to ${status}`);
    } catch (e) {
      showToast(e.message || 'Error updating order status', 'error');
    }
  };

  const removeOrderItem = async (index, item) => {
    const stockNote = ['Pending', 'Processing'].includes(selectedOrder.status)
      ? ' The item quantity will be returned to inventory.'
      : ' Inventory will not be changed for this order status.';
    if (!window.confirm(`Remove ${item.productName} (quantity ${item.quantity}) from this order?${stockNote}`)) {
      return;
    }

    setRemovingItemIndex(index);
    try {
      const result = await api.delete(`/admin/orders/${selectedOrder._id}/items/${index}`);
      setOrders((previous) => previous.map((order) =>
        order._id === selectedOrder._id ? { ...order, ...result.order } : order
      ));
      setSelectedOrder((previous) => ({ ...previous, ...result.order }));
      showToast(
        result.stockRestored
          ? `${item.productName} removed and inventory restored.`
          : `${item.productName} removed from the order.`
      );
    } catch (error) {
      showToast(error.message || 'Could not remove the order item.', 'error');
    } finally {
      setRemovingItemIndex(null);
    }
  };

  const deleteOrder = async () => {
    if (!selectedOrder) return;
    const orderId = selectedOrder._id;
    const stockNote = ['Pending', 'Processing'].includes(selectedOrder.status)
      ? ' Its item quantities will be returned to inventory.'
      : ' Inventory will not be changed for this order status.';
    if (!window.confirm(`Permanently delete order #${orderId.slice(-6)}? This cannot be undone.${stockNote}`)) {
      return;
    }

    try {
      const result = await api.delete(`/admin/orders/${orderId}`);
      setOrders((previous) => previous.filter((order) => order._id !== orderId));
      setSelectedOrder(null);
      showToast(result.stockRestored
        ? 'Order permanently deleted and inventory restored.'
        : 'Order permanently deleted.');
    } catch (error) {
      showToast(error.message || 'Could not delete the order.', 'error');
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const idMatch = o._id.toLowerCase().includes(searchTerm.toLowerCase());
      const customerMatch =
        (o.user?.name || o.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.user?.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.phone || '').includes(searchTerm);

      const statusMatch = statusFilter === 'all' ? true : o.status === statusFilter;

      return (idMatch || customerMatch) && statusMatch;
    });
  }, [orders, searchTerm, statusFilter]);

  return (
    <div className="slide-up">
      {/* Toast Alert */}
      {toast && (
        <div className={`admin-toast ${toast.type}`}>
          <span>{toast.type === 'success' ? '✓' : '⚠'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="admin-page-header">
        <div className="admin-page-title">
          <h1>Order Fulfillment</h1>
          <p>Review customer orders, shipping status, items ordered, and delivery addresses.</p>
        </div>
      </div>

      {/* Orders Card */}
      <div className="admin-card">
        {/* Toolbar */}
        <div className="admin-toolbar">
          <div className="admin-search-input">
            <span className="admin-search-icon"><SearchIcon size={16} /></span>
            <input
              type="text"
              placeholder="Search by order ID, customer name, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="admin-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Order Statuses ({orders.length})</option>
            <option value="Pending">Pending</option>
            <option value="Processing">Processing</option>
            <option value="Shipped">Shipped</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <div className="loader"></div>
            <p style={{ color: '#6b7280', marginTop: '12px' }}>Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#6b7280' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🛒</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>No orders found</h3>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search query or filters.'
                : 'Customer orders will appear here as soon as they are placed.'}
            </p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o) => {
                  let pillClass = 'pill-warning';
                  if (o.status === 'Delivered') pillClass = 'pill-success';
                  else if (o.status === 'Cancelled') pillClass = 'pill-danger';
                  else if (o.status === 'Shipped') pillClass = 'pill-orange';

                  const itemCount = o.items?.reduce((s, i) => s + (i.quantity || 1), 0) || 1;

                  return (
                    <tr key={o._id}>
                      <td>
                        <span style={{ fontWeight: 700, color: '#1f2937' }}>#{o._id.slice(-6)}</span>
                        <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
                          {new Date(o.createdAt || Date.now()).toLocaleDateString()}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#1f2937' }}>{o.user?.name || o.name || 'Customer'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{o.phone || o.user?.email || '—'}</div>
                      </td>
                      <td>
                        <span className="admin-pill pill-gray">{itemCount} items</span>
                      </td>
                      <td>
                        <strong style={{ color: '#f85606' }}>Rs. {money(o.totalAmount ?? o.total)}</strong>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: '#4b5563' }}>{o.payment || 'Cash on Delivery'}</span>
                      </td>
                      <td>
                        <span className={`admin-pill ${pillClass}`}>{o.status}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            onClick={() => setSelectedOrder(o)}
                            className="admin-btn admin-btn-secondary admin-btn-sm"
                            title="View Order Details"
                          >
                            Details
                          </button>
                          <select
                            className="admin-filter-select"
                            style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                            value={o.status}
                            onChange={(e) => updateStatus(o._id, e.target.value)}
                            disabled={o.status === 'Cancelled'}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Processing">Processing</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="admin-modal-backdrop" onClick={() => setSelectedOrder(null)}>
          <div className="admin-modal" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>Order Details #{selectedOrder._id.slice(-6)}</h2>
              <button className="admin-modal-close" onClick={() => setSelectedOrder(null)}>
                ✕
              </button>
            </div>
            <div className="admin-modal-body">
              {/* Customer info */}
              <div
                style={{
                  background: '#f8fafc',
                  padding: '16px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#1f2937' }}>Shipping & Customer Info</h4>
                <div style={{ fontSize: '0.85rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div><strong>Name:</strong> {selectedOrder.name || selectedOrder.user?.name || 'Customer'}</div>
                  <div><strong>Phone:</strong> {selectedOrder.phone || '—'}</div>
                  <div><strong>Email:</strong> {selectedOrder.user?.email || '—'}</div>
                  <div><strong>Payment:</strong> {selectedOrder.payment || 'Cash on Delivery'}</div>
                  <div style={{ gridColumn: 'span 2' }}><strong>Address:</strong> {selectedOrder.address || '—'}</div>
                </div>
              </div>

              {/* Items ordered */}
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#1f2937' }}>Items Ordered</h4>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Size</th>
                      <th>Qty</th>
                      <th>Price</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items?.map((it, idx) => (
                      <tr key={idx}>
                        <td>{it.productName || it.name || it.product?.name || `Product #${it.product?._id?.slice(-6) || it.product?.slice(-6) || ''}`}</td>
                        <td>Size {it.size}</td>
                        <td>{it.quantity}</td>
                        <td style={{ color: '#f85606', fontWeight: 600 }}>Rs. {money(it.price)}</td>
                        <td>
                          <button
                            type="button"
                            className="admin-btn admin-btn-secondary admin-btn-sm"
                            disabled={selectedOrder.items.length <= 1 || removingItemIndex !== null}
                            title={selectedOrder.items.length <= 1 ? 'An order must keep at least one item.' : 'Remove this item from the order'}
                            onClick={() => removeOrderItem(idx, it)}
                          >
                            {removingItemIndex === idx ? 'Removing...' : 'Remove'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {selectedOrder.items?.length === 1 && (
                <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '8px 0 0' }}>
                  The final item cannot be removed so the order record remains intact.
                </p>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', fontSize: '1.1rem' }}>
                <strong>Order Total: <span style={{ color: '#f85606' }}>Rs. {money(selectedOrder.totalAmount ?? selectedOrder.total)}</span></strong>
              </div>
            </div>
            <div className="admin-modal-footer">
              <button type="button" className="admin-btn admin-btn-danger" onClick={deleteOrder}>
                Delete Order
              </button>
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setSelectedOrder(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
