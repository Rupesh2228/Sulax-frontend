import { useState, useEffect } from 'react';
import { api } from '../../api.js';
import { AdminFormSkeleton } from '../../components/Skeletons.jsx';
import useDelayedLoading from '../../hooks/useDelayedLoading.js';

const PAGES = [
  { id: 'home', name: 'Home Page', icon: '🏠' },
  { id: 'products', name: 'Product Catalog / Shop', icon: '👟' },
  { id: 'product_details', name: 'Product Details (Template)', icon: '🏷️' },
  { id: 'contact', name: 'Contact Us', icon: '📞' },
  { id: 'cart', name: 'Shopping Cart', icon: '🛒' },
  { id: 'checkout', name: 'Checkout Funnel', icon: '💳' },
  { id: 'account', name: 'Customer Account', icon: '👤' },
  { id: 'wishlist', name: 'Customer Wishlist', icon: '❤️' },
];

const ROBOTS_OPTIONS = [
  { value: 'index, follow', label: 'index, follow (Recommended for public pages)' },
  { value: 'noindex, follow', label: 'noindex, follow (Hide from search, follow internal links)' },
  { value: 'noindex, nofollow', label: 'noindex, nofollow (Private/Checkout pages)' },
  { value: 'index, nofollow', label: 'index, nofollow (Index page, do not follow outbound links)' },
];

export default function AdminSEO() {
  const [selectedPage, setSelectedPage] = useState('home');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [jsonError, setJsonError] = useState('');
  const [toast, setToast] = useState(null);
  const showLoading = useDelayedLoading(loading);

  const [formData, setFormData] = useState({
    pageName: '',
    metaTitle: '',
    metaDescription: '',
    metaKeywords: '',
    canonicalUrl: '',
    robots: 'index, follow',
    ogTitle: '',
    ogDescription: '',
    ogImage: '',
    twitterCard: 'summary_large_image',
    focusKeyword: '',
    schemaJson: '',
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch SEO for the selected page
  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');
    setJsonError('');

    api
      .get(`/seo/${selectedPage}`)
      .then((res) => {
        if (!active) return;
        const s = res.seo || {};
        const pObj = PAGES.find((p) => p.id === selectedPage);

        setFormData({
          pageName: s.pageName || pObj?.name || selectedPage,
          metaTitle: s.metaTitle || '',
          metaDescription: s.metaDescription || '',
          metaKeywords: s.metaKeywords || '',
          canonicalUrl: s.canonicalUrl || `https://sulaxshoes.com/${selectedPage === 'home' ? '' : selectedPage}`,
          robots: s.robots || (['checkout', 'account'].includes(selectedPage) ? 'noindex, nofollow' : 'index, follow'),
          ogTitle: s.ogTitle || s.metaTitle || '',
          ogDescription: s.ogDescription || s.metaDescription || '',
          ogImage: s.ogImage || '',
          twitterCard: s.twitterCard || 'summary_large_image',
          focusKeyword: s.focusKeyword || '',
          schemaJson: s.schemaJson || '',
        });
      })
      .catch((err) => {
        if (active) {
          setLoadError(err.message || 'Failed to load SEO settings.');
          showToast(err.message || 'Failed to fetch SEO settings', 'error');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedPage, attempt]);

  // Format & Validate JSON-LD Schema
  const formatJsonLd = () => {
    if (!formData.schemaJson.trim()) {
      setJsonError('');
      return;
    }
    try {
      const parsed = JSON.parse(formData.schemaJson);
      const formatted = JSON.stringify(parsed, null, 2);
      setFormData((prev) => ({ ...prev, schemaJson: formatted }));
      setJsonError('');
      showToast('JSON-LD schema formatted & verified valid!');
    } catch (err) {
      setJsonError('Invalid JSON syntax: ' + err.message);
    }
  };

  // Save SEO
  const handleSave = async (e) => {
    e.preventDefault();

    if (formData.schemaJson.trim()) {
      try {
        JSON.parse(formData.schemaJson);
      } catch (err) {
        setJsonError('Invalid JSON syntax in Schema. Please format or correct it.');
        showToast('Invalid JSON syntax in Schema.', 'error');
        return;
      }
    }

    try {
      setSaving(true);
      await api.put(`/admin/seo/${selectedPage}`, formData);
      showToast(`SEO settings for ${PAGES.find((p) => p.id === selectedPage)?.name || selectedPage} saved!`);
      setJsonError('');
    } catch (err) {
      showToast(err.message || 'Error saving SEO settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Character counter helper
  const titleLen = formData.metaTitle.length;
  const descLen = formData.metaDescription.length;

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
          <h1>Search Engine Optimization (SEO)</h1>
          <p>
            Add a page title and description. Optional controls are grouped under Advanced settings.
          </p>
        </div>
        <button
          type="button"
          onClick={() => document.getElementById('admin-seo-form')?.requestSubmit()}
          disabled={saving || loading}
          className="admin-btn admin-btn-primary"
        >
          <span>💾</span>
          <span>{saving ? 'Saving Settings...' : 'Save Page SEO'}</span>
        </button>
      </div>

      {/* Page Tabs */}
      <div className="seo-page-tabs">
        {PAGES.map((page) => (
          <button
            key={page.id}
            type="button"
            className={`seo-page-tab ${selectedPage === page.id ? 'active' : ''}`}
            onClick={() => setSelectedPage(page.id)}
          >
            <span>{page.icon}</span>
            <span>{page.name}</span>
          </button>
        ))}
      </div>

      {loading ? (showLoading ? <AdminFormSkeleton /> : null) : loadError ? (
        <div className="admin-users-state" role="alert">
          <p>{loadError}</p>
          <button className="admin-btn admin-btn-secondary" type="button" onClick={() => setAttempt((value) => value + 1)}>Retry</button>
        </div>
      ) : (
        <form id="admin-seo-form" onSubmit={handleSave}>
          <div className="seo-grid">
            {/* Left Column: Form Inputs */}
            <div>
              {/* Card 1: Core Meta Tags */}
              <div className="admin-card">
                <div className="admin-card-header">
                  <h3 className="admin-card-title">
                    <span>🏷️</span> General Meta Tags (Page: {PAGES.find((p) => p.id === selectedPage)?.name})
                  </h3>
                </div>
                <div className="admin-card-body">
                  {/* Meta Title */}
                  <div className="form-group">
                    <label className="form-label">
                      <span>Meta Title <span style={{ color: '#ef4444' }}>*</span></span>
                      <span className={`char-meter ${titleLen >= 50 && titleLen <= 60 ? 'good' : titleLen > 70 ? 'bad' : 'warn'}`}>
                        {titleLen}/60 chars (Recommended: 50-60)
                      </span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Sulax Shoes - Best Footwear in Nepal"
                      maxLength={150}
                      value={formData.metaTitle}
                      onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                      required
                    />
                  </div>

                  {/* Meta Description */}
                  <div className="form-group">
                    <label className="form-label">
                      <span>Meta Description</span>
                      <span className={`char-meter ${descLen >= 140 && descLen <= 160 ? 'good' : descLen > 200 ? 'bad' : 'warn'}`}>
                        {descLen}/160 chars (Recommended: 140-160)
                      </span>
                    </label>
                    <textarea
                      className="form-textarea"
                      style={{ minHeight: '85px' }}
                      placeholder="Concise, compelling summary for Google search result snippets..."
                      maxLength={500}
                      value={formData.metaDescription}
                      onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                    />
                  </div>

                  </div>
              </div>

              <details className="seo-advanced">
                <summary>Advanced settings <span>Keywords, indexing, social previews, and structured data</span></summary>
                <div className="seo-advanced-content">
              <div className="admin-card">
                <div className="admin-card-header">
                  <h3 className="admin-card-title">Keywords and indexing</h3>
                </div>
                <div className="admin-card-body">
                  <div className="form-grid">
                    {/* Meta Keywords */}
                    <div className="form-group">
                      <label className="form-label">
                        <span>Keywords / Search Tags</span>
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="shoes nepal, sneakers, boots, kathmandu"
                        maxLength={500}
                        value={formData.metaKeywords}
                        onChange={(e) => setFormData({ ...formData, metaKeywords: e.target.value })}
                      />
                    </div>

                    {/* Focus Keyword */}
                    <div className="form-group">
                      <label className="form-label">
                        <span>Focus Keyword</span>
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. sneakers kathmandu"
                        maxLength={100}
                        value={formData.focusKeyword}
                        onChange={(e) => setFormData({ ...formData, focusKeyword: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-grid">
                    {/* Canonical URL */}
                    <div className="form-group">
                      <label className="form-label">
                        <span>Canonical URL</span>
                      </label>
                      <input
                        type="url"
                        className="form-input"
                        placeholder="https://sulaxshoes.com/..."
                        maxLength={500}
                        value={formData.canonicalUrl}
                        onChange={(e) => setFormData({ ...formData, canonicalUrl: e.target.value })}
                      />
                    </div>

                    {/* Robots Directive */}
                    <div className="form-group">
                      <label className="form-label">
                        <span>Robots Directives</span>
                      </label>
                      <select
                        className="form-select"
                        value={formData.robots}
                        onChange={(e) => setFormData({ ...formData, robots: e.target.value })}
                      >
                        {ROBOTS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Open Graph & Social Sharing */}
              <div className="admin-card">
                <div className="admin-card-header">
                  <h3 className="admin-card-title">
                    <span>📱</span> Open Graph & Social Media Sharing
                  </h3>
                </div>
                <div className="admin-card-body">
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">
                        <span>OG Share Title</span>
                        <span className="form-hint">Defaults to Meta Title</span>
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Title for Facebook, Twitter, WhatsApp..."
                        maxLength={150}
                        value={formData.ogTitle}
                        onChange={(e) => setFormData({ ...formData, ogTitle: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        <span>Twitter Card Type</span>
                      </label>
                      <select
                        className="form-select"
                        value={formData.twitterCard}
                        onChange={(e) => setFormData({ ...formData, twitterCard: e.target.value })}
                      >
                        <option value="summary_large_image">summary_large_image (Large banner card)</option>
                        <option value="summary">summary (Small thumbnail card)</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <span>OG Share Description</span>
                    </label>
                    <textarea
                      className="form-textarea"
                      style={{ minHeight: '70px' }}
                      placeholder="Description shown when link is posted on social media..."
                      maxLength={500}
                      value={formData.ogDescription}
                      onChange={(e) => setFormData({ ...formData, ogDescription: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <span>OG Social Image URL</span>
                      <span className="form-hint">1200x630px recommended</span>
                    </label>
                    <input
                      type="url"
                      className="form-input"
                      placeholder="https://example.com/banner.jpg"
                      maxLength={500}
                      value={formData.ogImage}
                      onChange={(e) => setFormData({ ...formData, ogImage: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: JSON-LD Structured Data Schema */}
              <div className="admin-card">
                <div className="admin-card-header">
                  <h3 className="admin-card-title">
                    <span>⚡</span> Structured Data (JSON-LD Schema)
                  </h3>
                  <button
                    type="button"
                    onClick={formatJsonLd}
                    className="admin-btn admin-btn-secondary admin-btn-sm"
                  >
                    Format & Validate JSON
                  </button>
                </div>
                <div className="admin-card-body">
                  <p style={{ fontSize: '0.82rem', color: '#6b7280', margin: '0 0 10px 0' }}>
                    Google uses JSON-LD schemas for Rich Snippets (e.g. Star Ratings, Product Prices, Search Boxes, Store Info).
                  </p>
                  <textarea
                    className="form-textarea"
                    style={{
                      minHeight: '180px',
                      fontFamily: 'Consolas, Monaco, monospace',
                      fontSize: '0.85rem',
                      lineHeight: '1.4',
                      background: '#f8fafc',
                    }}
                    placeholder='{\n  "@context": "https://schema.org",\n  "@type": "WebSite",\n  "name": "Sulax Shoes"\n}'
                    value={formData.schemaJson}
                    onChange={(e) => {
                      setFormData({ ...formData, schemaJson: e.target.value });
                      setJsonError('');
                    }}
                  />
                  {jsonError && <div className="form-error-msg">{jsonError}</div>}
                </div>
              </div>
                </div>
              </details>
            </div>

            {/* Right Column: Interactive Real-Time Previews */}
            <div>
              {/* Google SERP Preview */}
              <div className="serp-card">
                <div className="serp-header">
                  <span>🔍</span> Google Search Snippet Preview
                </div>
                <div className="serp-url-line">
                  <div className="serp-favicon">👟</div>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    sulaxshoes.com › {selectedPage === 'home' ? '' : selectedPage}
                  </div>
                </div>
                <div className="serp-title">
                  {formData.metaTitle || 'Page Title - Sulax Shoes Nepal'}
                </div>
                <div className="serp-snippet">
                  {formData.metaDescription ||
                    'Add a concise meta description to see how your website will appear in Google search engine results pages.'}
                </div>
              </div>

              {/* Social Media Card Preview */}
              <div className="serp-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb' }} className="serp-header">
                  <span>📱</span> Social Media Share Preview
                </div>
                <div className="social-card-preview">
                  {formData.ogImage ? (
                    <img src={formData.ogImage} alt="Social banner" className="social-preview-img" />
                  ) : (
                    <div className="social-preview-img">
                      <span>👟 Sulax Shoes</span>
                    </div>
                  )}
                  <div className="social-preview-body">
                    <div className="social-preview-domain">SULAXSHOES.COM</div>
                    <div className="social-preview-title">
                      {formData.ogTitle || formData.metaTitle || 'Sulax Shoes Nepal'}
                    </div>
                    <div className="social-preview-desc">
                      {formData.ogDescription || formData.metaDescription || 'Quality footwear collection in Nepal.'}
                    </div>
                  </div>
                </div>
              </div>

              {/* SEO Checklist & Tips */}
              <div className="admin-card">
                <div className="admin-card-header">
                  <h3 className="admin-card-title">
                    <span>💡</span> SEO Health Checklist
                  </h3>
                </div>
                <div className="admin-card-body" style={{ fontSize: '0.84rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ color: titleLen >= 40 && titleLen <= 65 ? '#10b981' : '#f59e0b' }}>
                      {titleLen >= 40 && titleLen <= 65 ? '✓' : '○'}
                    </span>
                    <span>Meta Title Length ({titleLen} chars)</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ color: descLen >= 120 && descLen <= 170 ? '#10b981' : '#f59e0b' }}>
                      {descLen >= 120 && descLen <= 170 ? '✓' : '○'}
                    </span>
                    <span>Meta Description Length ({descLen} chars)</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ color: formData.canonicalUrl ? '#10b981' : '#9ca3af' }}>
                      {formData.canonicalUrl ? '✓' : '○'}
                    </span>
                    <span>Canonical URL defined</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ color: formData.ogImage ? '#10b981' : '#9ca3af' }}>
                      {formData.ogImage ? '✓' : '○'}
                    </span>
                    <span>Social Share Image configured</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: formData.schemaJson ? '#10b981' : '#9ca3af' }}>
                      {formData.schemaJson ? '✓' : '○'}
                    </span>
                    <span>Structured Data JSON-LD present</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
