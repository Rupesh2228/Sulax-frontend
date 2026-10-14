import { useState, useEffect, useMemo, useRef } from 'react';
import Cropper from 'react-easy-crop';
import { api, imgUrl, money } from '../../api.js';
import { PlusIcon, EditIcon, TrashIcon, SearchIcon, AlertIcon } from '../../components/admin/AdminIcons.jsx';
import { TableSkeleton } from '../../components/Skeletons.jsx';
import useDelayedLoading from '../../hooks/useDelayedLoading.js';

const rotateSize = (width, height, rotation) => {
  const radians = (rotation * Math.PI) / 180;
  return {
    width: Math.abs(Math.cos(radians) * width) + Math.abs(Math.sin(radians) * height),
    height: Math.abs(Math.sin(radians) * width) + Math.abs(Math.cos(radians) * height),
  };
};

const createCroppedImage = async (imageUrl, cropPixels, rotation) => {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.src = imageUrl;
  await image.decode();

  const rotatedSize = rotateSize(image.naturalWidth, image.naturalHeight, rotation);
  const rotatedCanvas = document.createElement('canvas');
  rotatedCanvas.width = Math.ceil(rotatedSize.width);
  rotatedCanvas.height = Math.ceil(rotatedSize.height);
  const rotatedContext = rotatedCanvas.getContext('2d');
  if (!rotatedContext) throw new Error('Your browser could not prepare this image for cropping.');

  rotatedContext.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
  rotatedContext.rotate((rotation * Math.PI) / 180);
  rotatedContext.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);

  const scale = Math.min(1, 2000 / Math.max(cropPixels.width, cropPixels.height));
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = Math.max(1, Math.round(cropPixels.width * scale));
  outputCanvas.height = Math.max(1, Math.round(cropPixels.height * scale));
  const outputContext = outputCanvas.getContext('2d');
  if (!outputContext) throw new Error('Your browser could not finish cropping this image.');

  outputContext.drawImage(
    rotatedCanvas,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    outputCanvas.width,
    outputCanvas.height
  );
  rotatedCanvas.width = 0;
  rotatedCanvas.height = 0;

  const blob = await new Promise((resolve, reject) => {
    outputCanvas.toBlob(
      (result) => result ? resolve(result) : reject(new Error('Could not create the cropped image.')),
      'image/jpeg',
      0.9
    );
  });
  return new File([blob], `product-image-${Date.now()}.jpg`, { type: 'image/jpeg' });
};

const CATEGORY_PRESETS = [
  'Dolls',
  '3D-Printed Products',
  'T-shirts',
  'Backpacks',
  "Ladies' Bags",
  'Purses and Wallets',
  'Food Products',
  'Electronic Accessories',
  'Saris',
  'Kurtas',
];
const MAX_PRODUCT_SIZES = 30;

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const showLoading = useDelayedLoading(loading && products.length === 0);

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
    slug: '',
    category: 'Dolls',
    subcategory: '',
    brand: '',
    oldPrice: '',
    price: '',
    stock: '',
    sizes: [],
    description: '',
    status: 'active',
    featured: false,
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [cropOpen, setCropOpen] = useState(false);
  const [cropImage, setCropImage] = useState('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [cropError, setCropError] = useState('');
  const [cropping, setCropping] = useState(false);
  const previewObjectUrlRef = useRef('');
  const pendingCropObjectUrlRef = useRef('');
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
    setLoading(true);
    setLoadError('');
    try {
      const res = await api.get('/admin/products').catch(() => api.get('/products'));
      setProducts(res.products || []);
    } catch (err) {
      setLoadError(err.message || 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => () => {
    if (previewObjectUrlRef.current) URL.revokeObjectURL(previewObjectUrlRef.current);
    if (pendingCropObjectUrlRef.current) URL.revokeObjectURL(pendingCropObjectUrlRef.current);
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
    if (previewObjectUrlRef.current) URL.revokeObjectURL(previewObjectUrlRef.current);
    previewObjectUrlRef.current = '';
    if (pendingCropObjectUrlRef.current) URL.revokeObjectURL(pendingCropObjectUrlRef.current);
    pendingCropObjectUrlRef.current = '';
    setModalMode('add');
    setCurrentId(null);
    setFormData({
      name: '',
      slug: '',
      category: 'Dolls',
      subcategory: '',
      brand: '',
      oldPrice: '',
      price: '',
      stock: '',
      sizes: [],
      description: '',
      status: 'active',
      featured: false,
    });
    setSelectedFile(null);
    setPreviewUrl('');
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (p) => {
    if (previewObjectUrlRef.current) URL.revokeObjectURL(previewObjectUrlRef.current);
    previewObjectUrlRef.current = '';
    if (pendingCropObjectUrlRef.current) URL.revokeObjectURL(pendingCropObjectUrlRef.current);
    pendingCropObjectUrlRef.current = '';
    setModalMode('edit');
    setCurrentId(p._id);
    setFormData({
      name: p.name || '',
      slug: p.slug || '',
      category: p.category || 'Dolls',
      subcategory: p.subcategory || '',
      brand: p.brand || '',
      oldPrice: p.oldPrice ?? '',
      price: p.price ?? '',
      stock: p.stock ?? '',
      sizes: (p.sizes || []).map((entry) => ({
        size: String(entry.size),
        price: entry.price ?? p.price ?? '',
        stock: entry.stock ?? 0,
      })),
      description: p.description || '',
      status: p.status || 'active',
      featured: Boolean(p.featured),
    });
    setSelectedFile(null);
    setPreviewUrl(p.image ? imgUrl(p.image) : '');
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setFormErrors((prev) => ({ ...prev, image: 'Choose a JPG, PNG, or WEBP image.' }));
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setFormErrors((prev) => ({ ...prev, image: 'Image must be 10MB or smaller before cropping.' }));
        return;
      }
      if (pendingCropObjectUrlRef.current) URL.revokeObjectURL(pendingCropObjectUrlRef.current);
      const objectUrl = URL.createObjectURL(file);
      pendingCropObjectUrlRef.current = objectUrl;
      openCropEditor(objectUrl);
    }
  };

  const openCropEditor = (imageUrl) => {
    setCropImage(imageUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setAspect(1);
    setCropError('');
    setCroppedAreaPixels(null);
    setCropOpen(true);
  };

  const closeCropEditor = () => {
    if (pendingCropObjectUrlRef.current) URL.revokeObjectURL(pendingCropObjectUrlRef.current);
    pendingCropObjectUrlRef.current = '';
    setCropOpen(false);
    setCropImage('');
    setCropError('');
  };

  const applyCrop = async () => {
    if (!croppedAreaPixels || !cropImage) {
      setCropError('Adjust the crop area before applying it.');
      return;
    }
    try {
      setCropping(true);
      setCropError('');
      const croppedFile = await createCroppedImage(cropImage, croppedAreaPixels, rotation);
      const croppedUrl = URL.createObjectURL(croppedFile);
      if (previewObjectUrlRef.current) URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = croppedUrl;
      setSelectedFile(croppedFile);
      setPreviewUrl(croppedUrl);
      closeCropEditor();
      setFormErrors((previous) => ({ ...previous, image: null }));
    } catch (err) {
      setCropError(err.message || 'Could not crop this image. Try another image.');
    } finally {
      setCropping(false);
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Product name is required.';
    if (!formData.category.trim()) errors.category = 'Category is required.';
    if (Number(formData.price ?? 0) < 0) errors.price = 'Price must be 0 or more.';
    if (Number(formData.stock ?? 0) < 0) errors.stock = 'Stock must be 0 or more.';
    if (formData.sizes.length > 0) {
      const seenSizes = new Set();
      formData.sizes.forEach((entry, index) => {
        const normalizedSize = String(entry.size || '').trim().toLocaleLowerCase();
        if (!normalizedSize) errors[`sizeLabel${index}`] = 'Enter a size.';
        if (seenSizes.has(normalizedSize)) errors.sizes = 'Each size can only be added once.';
        seenSizes.add(normalizedSize);
        if (entry.price === '' || !Number.isFinite(Number(entry.price)) || Number(entry.price) < 0) {
          errors[`sizePrice${index}`] = 'Enter a valid price for this size.';
        }
        if (entry.stock === '' || !Number.isInteger(Number(entry.stock)) || Number(entry.stock) < 0) {
          errors[`sizeStock${index}`] = 'Enter a valid whole-number stock quantity.';
        }
      });
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const addSize = () => {
    setFormData((prev) => {
      if (prev.sizes.length >= MAX_PRODUCT_SIZES) return prev;
      return {
        ...prev,
        sizes: [...prev.sizes, { size: '', price: prev.sizes[0]?.price || '', stock: '0' }],
      };
    });
    setFormErrors((prev) => ({ ...prev, sizes: null }));
  };

  const updateSize = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      sizes: prev.sizes.map((entry, currentIndex) => currentIndex === index
        ? { ...entry, [field]: value }
        : entry),
    }));
  };

  // Submit Product (Add or Edit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const data = new FormData();
      const sanitizedName = formData.name.trim();
      const sanitizedCategory = formData.category.trim();
      const sizes = formData.sizes.map((entry) => ({
        size: String(entry.size || '').trim(),
        price: Number(entry.price || 0),
        stock: Number(entry.stock || 0),
      }));
      const basePrice = Number(formData.price || (sizes[0]?.price ?? 0));
      const computedStock = formData.sizes.length > 0
        ? sizes.reduce((total, entry) => total + Number(entry.stock || 0), 0)
        : Number(formData.stock || 0);

      data.append('name', sanitizedName);
      data.append('slug', (formData.slug || sanitizedName).trim());
      data.append('category', sanitizedCategory);
      data.append('subcategory', (formData.subcategory || '').trim());
      data.append('brand', (formData.brand || '').trim());
      data.append('price', String(basePrice));
      data.append('oldPrice', String(Number(formData.oldPrice || 0)));
      data.append('stock', String(computedStock));
      data.append('sizes', JSON.stringify(sizes));
      data.append('description', formData.description.trim());
      data.append('shortDescription', formData.description.trim().slice(0, 600));
      data.append('status', formData.status || 'active');
      data.append('featured', String(Boolean(formData.featured)));

      if (sizes.length > 0) {
        const minPrice = Math.min(...sizes.map((entry) => Number(entry.price || 0)));
        const originalPrice = Number(formData.oldPrice || 0);
        data.append('discount', String(originalPrice > minPrice && minPrice > 0
          ? Math.round(((originalPrice - minPrice) / originalPrice) * 100)
          : 0));
      } else {
        data.append('discount', String(Number(formData.oldPrice || 0) > basePrice && basePrice > 0
          ? Math.round(((Number(formData.oldPrice || 0) - basePrice) / Number(formData.oldPrice || 1)) * 100)
          : 0));
      }

      if (selectedFile) {
        data.append('images', selectedFile);
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
        {loadError && <div className="admin-users-state" role="alert">{loadError} <button className="admin-btn admin-btn-secondary" type="button" onClick={loadProducts}>Retry</button></div>}
        {loading && products.length === 0 ? (
          showLoading ? <TableSkeleton columns={5} rows={6} className="admin-table" /> : null
        ) : loadError && products.length === 0 ? null : filteredProducts.length === 0 ? (
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
                          <strong style={{ color: '#f85606' }}>{p.sizes?.length ? 'From ' : ''}Rs. {money(p.price)}</strong>
                          {p.sizes?.length > 0 && (
                            <div className="admin-size-price-summary">
                              {p.sizes.map((entry) => `${entry.size}: Rs. ${money(entry.price ?? p.price)}`).join(' · ')}
                            </div>
                          )}
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

                  {/* Old Price */}
                  <div className="form-group">
                    <label className="form-label">
                      Original / Old Price (Rs.)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="form-input"
                      placeholder="Optional"
                      value={formData.oldPrice}
                      onChange={(e) => setFormData((prev) => ({ ...prev, oldPrice: e.target.value }))}
                    />
                    <span className="form-hint">Discount is calculated from the lowest size price.</span>
                  </div>

                  <div className="form-group full-width admin-size-manager">
                    <div className="admin-size-manager__header">
                      <div>
                        <label className="form-label">Shoe Sizes, Prices & Stock <span style={{ color: '#ef4444' }}>*</span></label>
                        <p className="admin-size-manager__hint">Enter each size label manually. Total stock is calculated automatically.</p>
                      </div>
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary admin-btn-sm"
                        onClick={addSize}
                        disabled={formData.sizes.length >= MAX_PRODUCT_SIZES}
                      >
                        + Add size
                      </button>
                    </div>
                    {formData.sizes.map((entry, index) => (
                      <div className="admin-size-row" key={`${entry.size}-${index}`}>
                        <div className="form-group">
                          <label className="form-label" htmlFor={`product-size-${index}`}>Size</label>
                          <input
                            id={`product-size-${index}`}
                            type="text"
                            maxLength={20}
                            className="form-input"
                            placeholder="Enter size"
                            value={entry.size}
                            onChange={(e) => {
                              updateSize(index, 'size', e.target.value);
                              setFormErrors((prev) => ({ ...prev, [`sizeLabel${index}`]: null }));
                            }}
                          />
                          {formErrors[`sizeLabel${index}`] && <div className="form-error-msg">{formErrors[`sizeLabel${index}`]}</div>}
                        </div>
                        <div className="form-group">
                          <label className="form-label" htmlFor={`product-size-price-${index}`}>Price (Rs.)</label>
                          <input
                            id={`product-size-price-${index}`}
                            type="number"
                            min="0"
                            step="any"
                            className="form-input"
                            value={entry.price}
                            onChange={(e) => updateSize(index, 'price', e.target.value)}
                          />
                          {formErrors[`sizePrice${index}`] && <div className="form-error-msg">{formErrors[`sizePrice${index}`]}</div>}
                        </div>
                        <div className="form-group">
                          <label className="form-label" htmlFor={`product-size-stock-${index}`}>Stock</label>
                          <input
                            id={`product-size-stock-${index}`}
                            type="number"
                            min="0"
                            step="1"
                            className="form-input"
                            value={entry.stock}
                            onChange={(e) => updateSize(index, 'stock', e.target.value)}
                          />
                          {formErrors[`sizeStock${index}`] && <div className="form-error-msg">{formErrors[`sizeStock${index}`]}</div>}
                        </div>
                        <button
                          type="button"
                          className="admin-action-btn delete admin-size-remove"
                          title={`Remove size ${entry.size}`}
                          aria-label={`Remove size ${entry.size}`}
                          onClick={() => setFormData((prev) => ({
                            ...prev,
                            sizes: prev.sizes.filter((_, currentIndex) => currentIndex !== index),
                          }))}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {formErrors.sizes && <div className="form-error-msg" role="alert">{formErrors.sizes}</div>}
                    {formData.sizes.length === 0 && <p className="admin-size-manager__empty">Add at least one size before saving this product.</p>}
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
                        PNG, JPG, or WEBP up to 10MB. Crop before saving.
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
                          onClick={() => openCropEditor(previewUrl)}
                          className="admin-btn admin-btn-secondary admin-btn-sm"
                          disabled={submitting}
                        >
                          Crop image
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (previewObjectUrlRef.current) URL.revokeObjectURL(previewObjectUrlRef.current);
                            previewObjectUrlRef.current = '';
                            setSelectedFile(null);
                            setPreviewUrl(modalMode === 'edit' && currentId
                              ? imgUrl(products.find((product) => product._id === currentId)?.image || '')
                              : '');
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

      {cropOpen && (
        <div className="admin-crop-backdrop" onClick={() => !cropping && closeCropEditor()}>
          <div
            className="admin-crop-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-crop-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-modal-header">
              <div>
                <h2 id="admin-crop-title">Crop product image</h2>
                <p className="admin-crop-description">Move and zoom the image to frame the product.</p>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={closeCropEditor}
                disabled={cropping}
                aria-label="Close image crop editor"
              >
                ×
              </button>
            </div>
            <div className="admin-crop-area">
              <Cropper
                image={cropImage}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={aspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={(_area, pixels) => setCroppedAreaPixels(pixels)}
                showGrid
                restrictPosition={false}
              />
            </div>
            <div className="admin-crop-controls">
              <div className="admin-crop-ratios" aria-label="Crop aspect ratio">
                {[
                  { label: '1:1', value: 1 },
                  { label: '4:5', value: 4 / 5 },
                  { label: '16:9', value: 16 / 9 },
                ].map((ratio) => (
                  <button
                    key={ratio.label}
                    type="button"
                    className={`admin-btn admin-btn-sm ${aspect === ratio.value ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
                    onClick={() => setAspect(ratio.value)}
                  >
                    {ratio.label}
                  </button>
                ))}
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary admin-btn-sm"
                  onClick={() => setRotation((previous) => (previous + 90) % 360)}
                >
                  Rotate 90°
                </button>
              </div>
              <label className="admin-crop-zoom">
                <span>Zoom</span>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                />
              </label>
              {cropError && <div className="form-error-msg" role="alert">{cropError}</div>}
            </div>
            <div className="admin-modal-footer">
              <button type="button" className="admin-btn admin-btn-secondary" onClick={closeCropEditor} disabled={cropping}>
                Cancel
              </button>
              <button type="button" className="admin-btn admin-btn-primary" onClick={applyCrop} disabled={cropping}>
                {cropping ? 'Cropping…' : 'Apply crop'}
              </button>
            </div>
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
