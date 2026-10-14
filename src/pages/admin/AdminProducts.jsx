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
  'T-shirts',
  'Bag Packs',
  'Electronic Accessories',
  'Sari / Kurtha',
  '3D-Printed Products',
  'Backpacks',
  "Ladies' Bags",
  'Purses and Wallets',
  'Food Products',
  'Saris',
  'Kurtas',
];
const MAX_PRODUCT_SIZES = 30;
const MAX_PRODUCT_IMAGES = 3;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

const getCategoryKind = (category) => {
  const normalized = String(category || '').toLocaleLowerCase().replace(/[^a-z]/g, '');
  if (normalized === 'dolls') return 'dolls';
  if (normalized.includes('tshirt')) return 'tshirts';
  if (normalized.includes('bagpack') || normalized.includes('backpack')) return 'bags';
  if (normalized.includes('electronic') && normalized.includes('accessor')) return 'electronics';
  if (normalized.includes('sari') || normalized.includes('saree') || normalized.includes('kurtha') || normalized.includes('kurta')) return 'clothing';
  return 'standard';
};

const getProductImageEntries = (product) => {
  const images = product.images?.length
    ? product.images
    : product.image ? [{ url: product.image, public_id: product.imagePublicId || '' }] : [];
  return images.slice(0, MAX_PRODUCT_IMAGES).map((image, index) => ({
    url: image.url,
    public_id: image.public_id || '',
    existingIndex: index,
    file: null,
  }));
};

const getImagePreviewSource = (url) => url?.startsWith('blob:') ? url : imgUrl(url);

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
    bagType: '',
    sizeOptions: '',
    oldPrice: '',
    price: '',
    stock: '',
    sizes: [],
    description: '',
    status: 'active',
    featured: false,
  });
  const [imageItems, setImageItems] = useState([]);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropTargetIndex, setCropTargetIndex] = useState(0);
  const [cropImage, setCropImage] = useState('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [cropError, setCropError] = useState('');
  const [cropping, setCropping] = useState(false);
  const imagePreviewUrlsRef = useRef(new Set());
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

  const releaseImagePreviewUrls = () => {
    imagePreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    imagePreviewUrlsRef.current.clear();
  };

  const createImagePreviewUrl = (file) => {
    const url = URL.createObjectURL(file);
    imagePreviewUrlsRef.current.add(url);
    return url;
  };

  const releaseImagePreviewUrl = (url) => {
    if (!url || !imagePreviewUrlsRef.current.has(url)) return;
    URL.revokeObjectURL(url);
    imagePreviewUrlsRef.current.delete(url);
  };

  const closeProductModal = () => {
    if (pendingCropObjectUrlRef.current) URL.revokeObjectURL(pendingCropObjectUrlRef.current);
    pendingCropObjectUrlRef.current = '';
    releaseImagePreviewUrls();
    setImageItems([]);
    setIsModalOpen(false);
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
    imagePreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
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
    releaseImagePreviewUrls();
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
      bagType: '',
      sizeOptions: '',
      oldPrice: '',
      price: '',
      stock: '',
      sizes: [],
      description: '',
      status: 'active',
      featured: false,
    });
    setImageItems([]);
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (p) => {
    releaseImagePreviewUrls();
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
      bagType: p.bagType || '',
      sizeOptions: p.sizeOptions || (p.sizes || []).map((entry) => String(entry.size)).join(', '),
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
    setImageItems(getProductImageEntries(p));
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleFileChange = (e, targetIndex) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setFormErrors((prev) => ({ ...prev, image: 'Choose a JPG, PNG, or WEBP image.' }));
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setFormErrors((prev) => ({ ...prev, image: 'Image must be 3MB or smaller.' }));
        return;
      }
      if (targetIndex >= imageItems.length && imageItems.length >= MAX_PRODUCT_IMAGES) {
        setFormErrors((prev) => ({ ...prev, image: 'You can upload up to 3 product images.' }));
        return;
      }
      if (pendingCropObjectUrlRef.current) URL.revokeObjectURL(pendingCropObjectUrlRef.current);
      const objectUrl = URL.createObjectURL(file);
      pendingCropObjectUrlRef.current = objectUrl;
      openCropEditor(objectUrl, targetIndex);
    }
  };

  const openCropEditor = (imageUrl, targetIndex) => {
    setCropImage(imageUrl);
    setCropTargetIndex(targetIndex);
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
      if (croppedFile.size > MAX_IMAGE_BYTES) {
        throw new Error('The cropped image is larger than 3MB. Adjust the crop or choose another image.');
      }
      const croppedUrl = createImagePreviewUrl(croppedFile);
      const previousImage = imageItems[cropTargetIndex];
      if (previousImage) releaseImagePreviewUrl(previousImage.url);
      setImageItems((previous) => {
        const next = [...previous];
        next[cropTargetIndex] = { url: croppedUrl, public_id: '', existingIndex: null, file: croppedFile };
        return next.slice(0, MAX_PRODUCT_IMAGES);
      });
      closeCropEditor();
      setFormErrors((previous) => ({ ...previous, image: null }));
    } catch (err) {
      setCropError(err.message || 'Could not crop this image. Try another image.');
    } finally {
      setCropping(false);
    }
  };

  const removeImage = (index) => {
    const image = imageItems[index];
    if (image) releaseImagePreviewUrl(image.url);
    setImageItems((previous) => previous.filter((_, currentIndex) => currentIndex !== index));
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    const categoryKind = getCategoryKind(formData.category);
    const hasSharedStock = categoryKind !== 'standard';
    const hasTypedSizes = categoryKind === 'tshirts' || categoryKind === 'clothing';
    if (!formData.name.trim()) errors.name = 'Product name is required.';
    if (!formData.category.trim()) errors.category = 'Category is required.';
    if (categoryKind !== 'standard' && !formData.description.trim()) errors.description = 'Product description is required.';
    if (hasSharedStock) {
      if (formData.price === '' || !Number.isFinite(Number(formData.price)) || Number(formData.price) < 0) {
        errors.price = 'Enter a valid price.';
      }
      if (formData.stock === '' || !Number.isInteger(Number(formData.stock)) || Number(formData.stock) < 0) {
        errors.stock = 'Enter a valid whole-number stock quantity.';
      }
    } else if (formData.price !== '' && Number(formData.price) < 0) {
      errors.price = 'Price must be 0 or more.';
    }
    if (hasTypedSizes) {
      const options = formData.sizeOptions.split(',').map((size) => size.trim()).filter(Boolean);
      if (!options.length) errors.sizeOptions = 'Enter at least one size.';
      if (options.some((size) => size.length > 20)) errors.sizeOptions = 'Each size must be 20 characters or fewer.';
      if (new Set(options.map((size) => size.toLocaleLowerCase())).size !== options.length) {
        errors.sizeOptions = 'Each size can only be entered once.';
      }
    }
    if (!hasSharedStock) {
      if (!formData.sizes.length) errors.sizes = 'Add at least one size before saving this product.';
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
    if (imageItems.length > MAX_PRODUCT_IMAGES) errors.image = 'You can upload up to 3 product images.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const addSize = () => {
    setFormData((prev) => {
      if (prev.sizes.length >= MAX_PRODUCT_SIZES) return prev;
      return {
        ...prev,
        sizes: [...prev.sizes, { size: '', price: prev.price || prev.sizes[0]?.price || '', stock: '0' }],
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
      const categoryKind = getCategoryKind(formData.category);
      const hasSharedStock = categoryKind !== 'standard';
      const sanitizedName = formData.name.trim();
      const sanitizedCategory = formData.category.trim();
      const sizes = hasSharedStock ? [] : formData.sizes.map((entry) => ({
        size: String(entry.size || '').trim(),
        price: Number(entry.price || 0),
        stock: Number(entry.stock || 0),
      }));
      const basePrice = Number(hasSharedStock ? formData.price : formData.price || (sizes[0]?.price ?? 0));
      const computedStock = hasSharedStock
        ? Number(formData.stock || 0)
        : sizes.reduce((total, entry) => total + Number(entry.stock || 0), 0);

      data.append('name', sanitizedName);
      data.append('slug', (formData.slug || sanitizedName).trim());
      data.append('category', sanitizedCategory);
      data.append('subcategory', (formData.subcategory || '').trim());
      data.append('brand', (formData.brand || '').trim());
      data.append('bagType', formData.bagType.trim());
      data.append('sizeOptions', formData.sizeOptions.trim());
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

      let uploadIndex = 0;
      const imageOrder = imageItems.map((item) => {
        if (item.file) {
          data.append('images', item.file);
          return { type: 'upload', index: uploadIndex++ };
        }
        return { type: 'existing', index: item.existingIndex };
      });
      data.append('imageOrder', JSON.stringify(imageOrder));

      if (modalMode === 'add') {
        const res = await api.post('/admin/products', data);
        setProducts([res.product, ...products]);
        showToast('Product added successfully!');
      } else {
        const res = await api.put(`/admin/products/${currentId}`, data);
        setProducts(products.map((p) => (p._id === currentId ? res.product : p)));
        showToast('Product updated successfully!');
      }

      closeProductModal();
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
  const activeCategoryKind = getCategoryKind(formData.category);
  const usesSharedStock = activeCategoryKind !== 'standard';
  const usesTypedSizes = activeCategoryKind === 'tshirts' || activeCategoryKind === 'clothing';

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
          <p>Manage products, categories, inventory, pricing, and images.</p>
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
        <div className="admin-modal-backdrop" onClick={() => !submitting && closeProductModal()}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>{modalMode === 'add' ? 'Add New Product' : 'Edit Product'}</h2>
              <button
                className="admin-modal-close"
                onClick={() => !submitting && closeProductModal()}
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
                      onChange={(e) => {
                        const category = e.target.value;
                        const isSharedStock = getCategoryKind(category) !== 'standard';
                        setFormData((previous) => ({
                          ...previous,
                          category,
                          sizes: isSharedStock ? [] : previous.sizes,
                          price: isSharedStock ? previous.price || previous.sizes[0]?.price || '' : previous.price,
                          stock: isSharedStock
                            ? previous.stock || previous.sizes.reduce((sum, item) => sum + Number(item.stock || 0), 0)
                            : previous.stock,
                        }));
                      }}
                    />
                    <datalist id="category-suggestions">
                      {categories.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                    {formErrors.category && <div className="form-error-msg">{formErrors.category}</div>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="product-price">
                      {usesSharedStock ? 'Price (NPR)' : 'Default Price for New Sizes (Rs.)'}
                      {usesSharedStock && <span style={{ color: '#ef4444' }}> *</span>}
                    </label>
                    <input
                      id="product-price"
                      type="number"
                      min="0"
                      step="any"
                      className="form-input"
                      placeholder={usesSharedStock ? 'Enter price' : 'Optional'}
                      value={formData.price}
                      required={usesSharedStock}
                      onChange={(e) => setFormData((previous) => ({ ...previous, price: e.target.value }))}
                    />
                    {formErrors.price && <div className="form-error-msg">{formErrors.price}</div>}
                  </div>

                  {usesSharedStock && (
                    <div className="form-group">
                      <label className="form-label" htmlFor="product-stock">Stock *</label>
                      <input
                        id="product-stock"
                        type="number"
                        min="0"
                        step="1"
                        className="form-input"
                        value={formData.stock}
                        onChange={(e) => setFormData((previous) => ({ ...previous, stock: e.target.value }))}
                      />
                      {formErrors.stock && <div className="form-error-msg">{formErrors.stock}</div>}
                    </div>
                  )}

                  {usesTypedSizes && (
                    <div className="form-group full-width">
                      <label className="form-label" htmlFor="product-size-options">Size *</label>
                      <input
                        id="product-size-options"
                        type="text"
                        maxLength={500}
                        className="form-input"
                        placeholder={activeCategoryKind === 'tshirts'
                          ? 'Enter sizes (e.g., S, M, L, XL, XXL)'
                          : 'Enter sizes (e.g., Free Size, S, M, L, XL)'}
                        value={formData.sizeOptions}
                        onChange={(e) => setFormData((previous) => ({ ...previous, sizeOptions: e.target.value }))}
                      />
                      {formErrors.sizeOptions && <div className="form-error-msg">{formErrors.sizeOptions}</div>}
                    </div>
                  )}

                  {activeCategoryKind === 'bags' && (
                    <div className="form-group full-width">
                      <label className="form-label" htmlFor="product-bag-type">Bag Type</label>
                      <input
                        id="product-bag-type"
                        type="text"
                        maxLength={500}
                        className="form-input"
                        placeholder="Enter bag type (e.g., School, Travel, Laptop)"
                        value={formData.bagType}
                        onChange={(e) => setFormData((previous) => ({ ...previous, bagType: e.target.value }))}
                      />
                    </div>
                  )}

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
                    <span className="form-hint">{usesSharedStock ? 'Discount is calculated from the product price.' : 'Discount is calculated from the lowest size price.'}</span>
                  </div>

                  {!usesSharedStock && <div className="form-group full-width admin-size-manager">
                    <div className="admin-size-manager__header">
                      <div>
                        <label className="form-label">Size Variants, Prices & Stock <span style={{ color: '#ef4444' }}>*</span></label>
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
                  </div>}

                  <div className="form-group full-width">
                    <label className="form-label">Product Images</label>
                    <div className="admin-product-images">
                      {imageItems.map((image, index) => (
                        <div className="admin-product-image" key={`${image.public_id || image.url}-${index}`}>
                          <img src={getImagePreviewSource(image.url)} alt={`Product image ${index + 1} preview`} />
                          <div className="admin-product-image__actions">
                            <label className="admin-btn admin-btn-secondary admin-btn-sm">
                              Replace
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(e) => handleFileChange(e, index)}
                                disabled={submitting}
                              />
                            </label>
                            <button
                              type="button"
                              className="admin-btn admin-btn-secondary admin-btn-sm"
                              onClick={() => openCropEditor(getImagePreviewSource(image.url), index)}
                              disabled={submitting}
                            >
                              Crop
                            </button>
                            <button
                              type="button"
                              className="admin-btn admin-btn-secondary admin-btn-sm"
                              onClick={() => removeImage(index)}
                              disabled={submitting}
                              aria-label={`Remove product image ${index + 1}`}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                      {imageItems.length < MAX_PRODUCT_IMAGES && (
                        <label className="admin-product-image-add">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => handleFileChange(e, imageItems.length)}
                            disabled={submitting}
                          />
                          <span aria-hidden="true">📷</span>
                          <strong>Add image</strong>
                        </label>
                      )}
                    </div>
                    <p className="form-hint">PNG, JPG, or WEBP up to 3MB each. Add up to 3 images; crop and preview before saving.</p>
                    {formErrors.image && <div className="form-error-msg">{formErrors.image}</div>}
                  </div>

                  {/* Description */}
                  <div className="form-group full-width">
                    <label className="form-label">
                      Product Description
                      {usesSharedStock && <span style={{ color: '#ef4444' }}> *</span>}
                    </label>
                    <textarea
                      className="form-textarea"
                      placeholder={activeCategoryKind === 'standard'
                        ? 'Describe features, sole material, fit, and styling tips...'
                        : 'Describe the product features and details...'}
                      value={formData.description}
                      required={usesSharedStock}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                    {formErrors.description && <div className="form-error-msg">{formErrors.description}</div>}
                  </div>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={closeProductModal}
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
