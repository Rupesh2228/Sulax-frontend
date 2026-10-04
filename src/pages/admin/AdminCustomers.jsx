import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { SearchIcon } from '../../components/admin/AdminIcons.jsx';
import { TableSkeleton } from '../../components/Skeletons.jsx';
import useDelayedLoading from '../../hooks/useDelayedLoading.js';

const emptyForm = { name: '', email: '', phone: '', address: '' };

function validationMessages(error) {
  return (error.errors || []).reduce((result, item) => {
    if (item.field) result[item.field] = item.message;
    return result;
  }, {});
}

export default function AdminCustomers() {
  const [searchParams] = useSearchParams();
  const requestedCustomerId = searchParams.get('customer');
  const { user: adminUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchTerm, setSearchTerm] = useState(requestedCustomerId || '');
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyUserId, setBusyUserId] = useState('');
  const [toast, setToast] = useState(null);
  const showLoading = useDelayedLoading(loading && users.length === 0);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3500);
  };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const result = await api.get('/admin/users');
      setUsers(result.users || []);
    } catch (error) {
      setLoadError(error.message || 'Could not load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (requestedCustomerId) setSearchTerm(requestedCustomerId);
  }, [requestedCustomerId]);

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return users;
    return users.filter((item) =>
      [item.name, item.email, item.phone, item._id].some((value) =>
        String(value || '').toLowerCase().includes(query)
      )
    );
  }, [users, searchTerm]);

  const beginEdit = (item) => {
    setEditingUser(item);
    setFormData({
      name: item.name || '',
      email: item.email || '',
      phone: item.phone || '',
      address: item.address || '',
    });
    setFieldErrors({});
    setFormError('');
  };

  const closeEdit = () => {
    if (saving) return;
    setEditingUser(null);
    setFieldErrors({});
    setFormError('');
  };

  const saveUser = async (event) => {
    event.preventDefault();
    setFieldErrors({});
    setFormError('');
    setSaving(true);
    try {
      const result = await api.put(`/admin/users/${editingUser._id}`, formData);
      setUsers((previous) => previous.map((item) =>
        item._id === editingUser._id ? { ...item, ...result.user } : item
      ));
      setEditingUser(null);
      showToast('User details saved.');
    } catch (error) {
      setFieldErrors(validationMessages(error));
      setFormError(error.message || 'Could not save user details.');
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async (target, role) => {
    setBusyUserId(target._id);
    try {
      const result = await api.patch(`/admin/users/${target._id}/role`, { role });
      setUsers((previous) => previous.map((item) =>
        item._id === target._id ? { ...item, role: result.user.role } : item
      ));
      showToast(`${target.name} is now ${role === 'admin' ? 'an admin' : 'a customer'}.`);
    } catch (error) {
      showToast(error.message || 'Could not update user role.', 'error');
      await loadUsers();
    } finally {
      setBusyUserId('');
    }
  };

  const deleteUser = async (target) => {
    if (!window.confirm(
      `Delete ${target.name}'s account and support-chat history? This cannot be undone. Their order history will be retained.`
    )) return;
    setBusyUserId(target._id);
    try {
      await api.delete(`/admin/users/${target._id}`);
      setUsers((previous) => previous.filter((item) => item._id !== target._id));
      showToast('User account deleted.');
    } catch (error) {
      showToast(error.message || 'Could not delete user.', 'error');
    } finally {
      setBusyUserId('');
    }
  };

  return (
    <div className="slide-up">
      {toast && (
        <div className={`admin-toast ${toast.type}`} role="status">
          <span>{toast.type === 'success' ? '✓' : '⚠'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      <div className="admin-page-header">
        <div className="admin-page-title">
          <h1>User Management ({users.length})</h1>
          <p>Edit user details, manage administrator access, or remove an account.</p>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-toolbar">
          <div className="admin-search-input">
            <span className="admin-search-icon"><SearchIcon size={16} /></span>
            <input
              type="search"
              placeholder="Search name, email, phone, or ID..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
        </div>

        {loadError && users.length > 0 && <p className="admin-users-state" role="alert">{loadError}</p>}
        {loading && users.length === 0 ? (
          showLoading ? <TableSkeleton columns={6} rows={6} className="admin-table" /> : null
        ) : loadError && users.length === 0 ? (
          <div className="admin-users-state" role="alert">
            <p>{loadError}</p>
            <button className="admin-btn admin-btn-secondary" type="button" onClick={loadUsers}>Retry</button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="admin-users-state">
            <h3>No users found</h3>
            <p>{searchTerm ? 'Try another search.' : 'Registered accounts will appear here.'}</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Joined</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((item) => {
                  const isSelf = item._id === adminUser?.id || item._id === adminUser?._id;
                  return (
                    <tr key={item._id}>
                      <td>
                        <div className="admin-user-cell">
                          <span className="admin-avatar">{item.name?.charAt(0).toUpperCase() || 'U'}</span>
                          <span>
                            <strong>{item.name}</strong>
                            <small>ID: {item._id.slice(-6)}{isSelf ? ' · You' : ''}</small>
                          </span>
                        </div>
                      </td>
                      <td><a href={`mailto:${item.email}`}>{item.email}</a></td>
                      <td>{item.phone || '—'}</td>
                      <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                      <td>
                        <select
                          className="admin-filter-select admin-user-role-select"
                          aria-label={`Role for ${item.name}`}
                          value={item.role}
                          disabled={isSelf || busyUserId === item._id}
                          onChange={(event) => changeRole(item, event.target.value)}
                        >
                          <option value="user">Customer</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td>
                        <div className="admin-actions-cell">
                          <button
                            className="admin-btn admin-btn-secondary admin-btn-sm"
                            type="button"
                            onClick={() => beginEdit(item)}
                          >Edit</button>
                          <button
                            className="admin-btn admin-btn-danger admin-btn-sm"
                            type="button"
                            disabled={isSelf || busyUserId === item._id}
                            onClick={() => deleteUser(item)}
                          >Delete</button>
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

      {editingUser && (
        <div className="admin-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeEdit();
        }}>
          <form className="admin-modal" onSubmit={saveUser}>
            <div className="admin-modal-header">
              <div>
                <h2>Edit user</h2>
                <p className="admin-user-modal-subtitle">{editingUser.email}</p>
              </div>
              <button className="admin-modal-close" type="button" aria-label="Close" onClick={closeEdit}>×</button>
            </div>
            <div className="admin-modal-body">
              {formError && <div className="admin-form-alert" role="alert">{formError}</div>}
              <label className="form-group">
                <span className="form-label">Full name</span>
                <input
                  className="form-input"
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                  value={formData.name}
                  onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                  aria-invalid={Boolean(fieldErrors.name)}
                />
                {fieldErrors.name && <span className="form-error-msg">{fieldErrors.name}</span>}
              </label>
              <label className="form-group">
                <span className="form-label">Email address</span>
                <input
                  className="form-input"
                  type="email"
                  required
                  maxLength={200}
                  autoComplete="email"
                  value={formData.email}
                  onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                  aria-invalid={Boolean(fieldErrors.email)}
                />
                {fieldErrors.email && <span className="form-error-msg">{fieldErrors.email}</span>}
              </label>
              <label className="form-group">
                <span className="form-label">Phone</span>
                <input
                  className="form-input"
                  type="tel"
                  required
                  pattern="\\+?[0-9\\s-]{7,20}"
                  maxLength={20}
                  autoComplete="tel"
                  value={formData.phone}
                  onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                  aria-invalid={Boolean(fieldErrors.phone)}
                />
                {fieldErrors.phone && <span className="form-error-msg">{fieldErrors.phone}</span>}
              </label>
              <label className="form-group">
                <span className="form-label">Address</span>
                <textarea
                  className="form-textarea"
                  required
                  maxLength={1000}
                  autoComplete="street-address"
                  value={formData.address}
                  onChange={(event) => setFormData({ ...formData, address: event.target.value })}
                  aria-invalid={Boolean(fieldErrors.address)}
                />
                {fieldErrors.address && <span className="form-error-msg">{fieldErrors.address}</span>}
              </label>
            </div>
            <div className="admin-modal-footer">
              <button className="admin-btn admin-btn-secondary" type="button" disabled={saving} onClick={closeEdit}>
                Cancel
              </button>
              <button className="admin-btn admin-btn-primary" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
