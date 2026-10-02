import { useState, useEffect, useMemo } from 'react';
import { api, imgUrl, money } from '../../api.js';
import { PlusIcon, EditIcon, TrashIcon, SearchIcon, AlertIcon } from '../../components/admin/AdminIcons.jsx';

const CATEGORY_PRESETS = ['Sneakers', 'Running', 'Boots', 'Formal', 'Sandals', 'Casual', 'Sports'];

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [currentId, setCurrentId] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: 'Sneakers',
    price: '',
    oldPrice: '',
    discount: '',
    stock: '',
    description: '',
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Delete modal state
  const [deleteModalProduct, setDeleteModalProduct] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/products').catch(() => api.get('/products'));
      setProducts(res.products || []);
    } catch (err) {
      showToast('Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const matchesSearch =
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.category.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCategory = selectedCategory ? p.category === selectedCategory : true;

        let matchesStock = true;
        if (stockFilter === 'in_stock') matchesStock = p.stock > 5;
        else if (stockFilter === 'low_stock') matchesStock = p.stock > 0 && p.stock <= 5;
        else if (stockFilter === 'out_of_stock') matchesStock = p.stock === 0;

        return matchesSearch && matchesCategory && matchesStock;
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return a.price - b.price;
        if (sortBy === 'price_desc') return b.price - a.price;
        if (sortBy === 'stock_asc') return a.stock - b.stock;
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });
  }, [products, searchTerm, selectedCategory, stockFilter, sortBy]);

  // Open Add Modal
  const openAddModal = () => {
    setModalMode('add');
    setCurrentId(null);
    setFormData({
      name: '',
      category: 'Sneakers',
      price: '',
      oldPrice: '',
      discount: '',
      stock: '10',
      description: '',
    });
    setSelectedFile(null);
    setPreviewUrl('');
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (p) => {
    setModalMode('edit');
    setCurrentId(p._id);
    setFormData({
      name: p.name || '',
      category: p.category || 'Sneakers',
      price: p.price ?? '',
      oldPrice: p.oldPrice ?? '',
      discount: p.discount ?? '',
      stock: p.stock ?? 0,
      description: p.description || '',
    });
    setSelectedFile(null);
    setPreviewUrl(p.image ? imgUrl(p.image) : '');
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Auto calculate discount
  const handlePriceChange = (priceVal, oldPriceVal) => {
    const p = parseFloat(priceVal) || 0;
    const op = parseFloat(oldPriceVal) || 0;
    let disc = formData.discount;
    if (op > p && p > 0) {
      disc = Math.round(((op - p) / op) * 100);
    } else if (op <= p) {
      disc = 0;
    }
    setFormData((prev) => ({
      ...prev,
      price: priceVal,
      oldPrice: oldPriceVal,
      discount: disc,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        setFormErrors((prev) => ({ ...prev, image: 'File size must be under 3MB.' }));
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setFormErrors((prev) => ({ ...prev, image: null }));
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Product name is required.';
    if (!formData.category.trim()) errors.category = 'Category is required.';
    if (formData.price === '' || isNaN(formData.price) || Number(formData.price) < 0) {
      errors.price = 'Valid price is required.';
    }
    if (formData.stock === '' || isNaN(formData.stock) || Number(formData.stock) < 0) {
      errors.stock = 'Valid stock quantity is required.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Product (Add or Edit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const data = new FormData();
      data.append('name', formData.name.trim());
      data.append('category', formData.category.trim());
      data.append('price', String(Number(formData.price)));
      data.append('oldPrice', String(Number(formData.oldPrice || 0)));
      data.append('discount', String(Number(formData.discount || 0)));
      data.append('stock', String(Number(formData.stock)));
      data.append('description', formData.description.trim());

      if (selectedFile) {
        data.append('image', selectedFile);
      }

      if (modalMode === 'add') {
        const res = await api.post('/admin/products', data);
        setProducts([res.product, ...products]);
        showToast('Product added successfully!');
      } else {
        const res = await api.put(`/admin/products/${currentId}`, data);
        setProducts(products.map((p) => (p._id === currentId ? res.product : p)));
        showToast('Product updated successfully!');
      }

      setIsModalOpen(false);
    } catch (err) {
      showToast(err.message || 'Operation failed. Please check form inputs.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Product
  const confirmDelete = async () => {
    if (!deleteModalProduct) return;
    try {
      setDeleting(true);
      await api.delete(`/admin/products/${deleteModalProduct._id}`);
      setProducts(products.filter((p) => p._id !== deleteModalProduct._id));
      showToast(`"${deleteModalProduct.name}" deleted.`);
      setDeleteModalProduct(null);
    } catch (err) {
      showToast(err.message || 'Error deleting product', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const categories = Array.from(new Set([...CATEGORY_PRESETS, ...products.map((p) => p.category)]));

  return (
    <div className="slide-up">
      {/* Toast Alert */}
      {toast && (
        <div className={`admin-toast ${toast.type}`}>
          <span>{toast.type === 'success' ? '✓' : '⚠'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="admin-page-header">
        <div className="admin-page-title">
          <h1>Product Catalog</h1>
          <p>Manage shoe inventory, pricing, stock levels, and product images.</p>
        </div>
        <button onClick={openAddModal} className="admin-btn admin-btn-primary">
          <PlusIcon size={16} />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Main Card with Toolbar & Table */}
      <div className="admin-card">
        {/* Toolbar */}
        <div className="admin-toolbar">
          <div className="admin-search-input">
            <span className="admin-search-icon"><SearchIcon size={16} /></span>
            <input
              type="text"
              placeholder="Search products by name or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="admin-filter-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories ({products.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            className="admin-filter-select"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
          >
            <option value="all">All Stock Statuses</option>
            <option value="in_stock">In Stock (&gt; 5)</option>
            <option value="low_stock">Low Stock (1 - 5)</option>
            <option value="out_of_stock">Out of Stock (0)</option>
          </select>

          <select
            className="admin-filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">Sort: Newest First</option>
            <option value="price_asc">Sort: Price (Low to High)</option>
            <option value="price_desc">Sort: Price (High to Low)</option>
            <option value="stock_asc">Sort: Stock (Low to High)</option>
          </select>
        </div>

        {/* Table Content */}
        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <div className="loader"></div>
            <p style={{ color: '#6b7280', marginTop: '12px' }}>Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#6b7280' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>👟</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>No products found</h3>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              {searchTerm || selectedCategory || stockFilter !== 'all'
                ? 'Try adjusting your search query or filters.'
                : 'Click "+ Add New Product" above to create your first shoe item.'}
            </p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '38%' }}>Product</th>
                  <th style={{ width: '15%' }}>Category</th>
                  <th style={{ width: '16%' }}>Price</th>
                  <th style={{ width: '15%' }}>Stock Status</th>
                  <th style={{ width: '16%', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  let stockPillClass = 'pill-success';
                  let stockText = `${p.stock} in stock`;
                  if (p.stock === 0) {
                    stockPillClass = 'pill-danger';
                    stockText = 'Out of Stock';
                  } else if (p.stock <= 5) {
                    stockPillClass = 'pill-warning';
                    stockText = `Low: ${p.stock} left`;
                  }

                  return (
                    <tr key={p._id}>
                      <td>
                        <div className="product-cell">
                          <div className="product-thumb">
                            {p.image ? (
                              <img
                                src={imgUrl(p.image)}
                                alt={p.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '7px' }}
                              />
                            ) : (
                              <span>👟</span>
                            )}
                          </div>
                          <div className="product-name-block">
                            <span className="product-name-title">{p.name}</span>
                            <span className="product-category-tag">ID: {p._id.slice(-6)}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="admin-pill pill-gray">{p.category}</span>
                      </td>
                      <td>
                        <div>
                          <strong style={{ color: '#f85606' }}>Rs. {money(p.price)}</strong>
                          {p.oldPrice > p.price && (
                            <div style={{ fontSize: '0.75rem', color: '#9ca3af', textDecoration: 'line-through' }}>
                              Rs. {money(p.oldPrice)}
                            </div>
                          )}
                          {p.discount > 0 && (
                            <span className="admin-pill pill-orange" style={{ fontSize: '0.68rem', padding: '1px 5px', marginTop: '2px' }}>
                              {p.discount}% OFF
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`admin-pill ${stockPillClass}`}>{stockText}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="admin-actions-cell" style={{ justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => openEditModal(p)}
                            className="admin-action-btn"
                            title="Edit Product"
                          >
                            <EditIcon size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteModalProduct(p)}
                            className="admin-action-btn delete"
                            title="Delete Product"
                          >
                            <TrashIcon size={14} />
                          </button>
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

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => !submitting && setIsModalOpen(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>{modalMode === 'add' ? 'Add New Product' : 'Edit Product'}</h2>
              <button
                className="admin-modal-close"
                onClick={() => !submitting && setIsModalOpen(false)}
                disabled={submitting}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="admin-modal-body">
                <div className="form-grid">
                  {/* Name */}
                  <div className="form-group full-width">
                    <label className="form-label">
                      Product Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Sulax Air Pro Runner"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                    {formErrors.name && <div className="form-error-msg">{formErrors.name}</div>}
                  </div>

                  {/* Category */}
                  <div className="form-group">
                    <label className="form-label">
                      Category <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      list="category-suggestions"
                      className="form-input"
                      placeholder="e.g. Sneakers"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    />
                    <datalist id="category-suggestions">
                      {categories.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                    {formErrors.category && <div className="form-error-msg">{formErrors.category}</div>}
                  </div>

                  {/* Stock */}
                  <div className="form-group">
                    <label className="form-label">
                      Stock Quantity <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      placeholder="e.g. 25"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    />
                    {formErrors.stock && <div className="form-error-msg">{formErrors.stock}</div>}
                  </div>

                  {/* Price */}
                  <div className="form-group">
                    <label className="form-label">
                      Selling Price (Rs.) <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="form-input"
                      placeholder="e.g. 2999"
                      value={formData.price}
                      onChange={(e) => handlePriceChange(e.target.value, formData.oldPrice)}
                    />
                    {formErrors.price && <div className="form-error-msg">{formErrors.price}</div>}
                  </div>

                  {/* Old Price */}
                  <div className="form-group">
                    <label className="form-label">
                      Original / Old Price (Rs.)
                      <span className="form-hint">Optional</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="form-input"
                      placeholder="e.g. 3999"
                      value={formData.oldPrice}
                      onChange={(e) => handlePriceChange(formData.price, e.target.value)}
                    />
                  </div>

                  {/* Discount */}
                  <div className="form-group full-width">
                    <label className="form-label">
                      Discount %
                      <span className="form-hint">Auto-calculated or override</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="form-input"
                      placeholder="e.g. 25"
                      value={formData.discount}
                      onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                    />
                  </div>

                  {/* Image Upload */}
                  <div className="form-group full-width">
                    <label className="form-label">Product Image</label>
                    <div className="image-upload-box" onClick={() => document.getElementById('product-image-input').click()}>
                      <input
                        id="product-image-input"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                      />
                      <div style={{ fontSize: '1.8rem', marginBottom: '6px' }}>📷</div>
                      <div style={{ fontWeight: 600, color: '#f85606', fontSize: '0.9rem' }}>
                        Click to upload product image
                      </div>
                      <div style={{ color: '#9ca3af', fontSize: '0.78rem', marginTop: '4px' }}>
                        PNG, JPG, or WEBP up to 3MB
                      </div>
                    </div>

                    {previewUrl && (
                      <div className="image-preview-container">
                        <img src={previewUrl} alt="Preview" className="image-preview-thumb" />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1f2937' }}>
                            {selectedFile ? selectedFile.name : 'Current Product Image'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#10b981' }}>
                            Ready to save
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFile(null);
                            setPreviewUrl('');
                          }}
                          className="admin-btn admin-btn-secondary admin-btn-sm"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                    {formErrors.image && <div className="form-error-msg">{formErrors.image}</div>}
                  </div>

                  {/* Description */}
                  <div className="form-group full-width">
                    <label className="form-label">Product Description</label>
                    <textarea
                      className="form-textarea"
                      placeholder="Describe features, sole material, fit, and styling tips..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : modalMode === 'add' ? 'Create Product' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalProduct && (
        <div className="admin-modal-backdrop" onClick={() => !deleting && setDeleteModalProduct(null)}>
          <div className="admin-modal" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header" style={{ borderBottomColor: '#fee2e2' }}>
              <h2 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚠</span> Delete Product
              </h2>
              <button
                className="admin-modal-close"
                onClick={() => !deleting && setDeleteModalProduct(null)}
                disabled={deleting}
              >
                ✕
              </button>
            </div>
            <div className="admin-modal-body">
              <p style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#374151' }}>
                Are you sure you want to delete <strong>"{deleteModalProduct.name}"</strong>?
              </p>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#6b7280' }}>
                This action is permanent and cannot be undone. Its image file and any customer wishlist references will also be removed.
              </p>
            </div>
            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => setDeleteModalProduct(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-danger"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Yes, Delete Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
