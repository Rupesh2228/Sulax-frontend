import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { AdminFormSkeleton } from '../../components/Skeletons.jsx';
import useDelayedLoading from '../../hooks/useDelayedLoading.js';

const PAGES = [
  { id: 'product', name: 'Product SEO', icon: '🏷️' },
];

const EMPTY_FORM = {
  pageName: '',
  metaTitle: '',
  metaDescription: '',
  h1: '',
  description: '',
  faq: '',
};

export default function AdminSEO() {
  const [selectedPage, setSelectedPage] = useState('product');
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const showLoading = useDelayedLoading(loading);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');

    api.get(`/seo/${selectedPage}`)
      .then((res) => {
        if (!active) return;
        const seo = res.seo || {};
        const page = PAGES.find((item) => item.id === selectedPage);
        setFormData({
          pageName: seo.pageName || page?.name || selectedPage,
          metaTitle: seo.metaTitle || '',
          metaDescription: seo.metaDescription || '',
          h1: seo.h1 || '',
          description: seo.description || '',
          faq: seo.faq || '',
        });
      })
      .catch((error) => {
        if (active) {
          setLoadError(error.message || 'Failed to load SEO settings.');
          showToast(error.message || 'Failed to load SEO settings.', 'error');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedPage, attempt]);

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      await api.put(`/admin/seo/${selectedPage}`, formData);
      showToast(`SEO settings for ${PAGES.find((page) => page.id === selectedPage)?.name} saved.`);
    } catch (error) {
      showToast(error.message || 'Error saving SEO settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const titleLength = formData.metaTitle.length;
  const descriptionLength = formData.metaDescription.length;
  const productDescriptionLength = formData.description.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="slide-up">
      {toast && (
        <div className={`admin-toast ${toast.type}`}>
          <span>{toast.type === 'success' ? '✓' : '⚠'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      <div className="admin-page-header">
        <div className="admin-page-title">
          <h1>Product Search Engine Optimization (SEO)</h1>
          <p>Manage product title, description, H1, original page copy, and FAQ content used for search.</p>
        </div>
        <button
          type="submit"
          form="admin-seo-form"
          disabled={saving || loading}
          className="admin-btn admin-btn-primary"
        >
          <span>💾</span>
          <span>{saving ? 'Saving Settings...' : 'Save Page SEO'}</span>
        </button>
      </div>

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
          <button className="admin-btn admin-btn-secondary" type="button" onClick={() => setAttempt((value) => value + 1)}>
            Retry
          </button>
        </div>
      ) : (
        <form id="admin-seo-form" onSubmit={handleSave}>
          <div className="seo-grid">
            <div>
              <div className="admin-card">
                <div className="admin-card-header">
                  <h3 className="admin-card-title">Product SEO fields</h3>
                </div>
                <div className="admin-card-body">
                  <div className="form-group">
                    <label className="form-label">
                      <span>Title tag <span style={{ color: '#ef4444' }}>*</span></span>
                      <span className="char-meter">{titleLength}/60 characters</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Product name + type + Price in Nepal + brand"
                      maxLength={70}
                      value={formData.metaTitle}
                      onChange={(event) => updateField('metaTitle', event.target.value)}
                      required
                    />
                    <small className="form-hint">Aim for about 60 characters.</small>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <span>Meta description <span style={{ color: '#ef4444' }}>*</span></span>
                      <span className="char-meter">{descriptionLength}/160 characters</span>
                    </label>
                    <textarea
                      className="form-textarea"
                      placeholder="Include a product benefit and a call to action, such as cash on delivery across Nepal."
                      minLength={140}
                      maxLength={160}
                      value={formData.metaDescription}
                      onChange={(event) => updateField('metaDescription', event.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">H1 heading</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Product name"
                      maxLength={200}
                      value={formData.h1}
                      onChange={(event) => updateField('h1', event.target.value)}
                    />
                    <small className="form-hint">Use one H1 per page, normally the product name.</small>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <span>Original product description</span>
                      <span className="char-meter">{productDescriptionLength} words</span>
                    </label>
                    <textarea
                      className="form-textarea"
                      style={{ minHeight: '180px' }}
                      placeholder="Write 100-150 original words covering material, sole, fit, sizes, and who the product is for."
                      maxLength={5000}
                      value={formData.description}
                      onChange={(event) => updateField('description', event.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">FAQ block</label>
                    <textarea
                      className="form-textarea"
                      style={{ minHeight: '150px' }}
                      placeholder={'Sizing: How does it fit?\nDelivery: When will it arrive?\nExchanges: How can I exchange it?'}
                      maxLength={5000}
                      value={formData.faq}
                      onChange={(event) => updateField('faq', event.target.value)}
                    />
                    <small className="form-hint">Answer sizing, delivery time, and exchanges for long-tail searches.</small>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="serp-card">
                <div className="serp-header">🔍 Search snippet preview</div>
                <div className="serp-title">{formData.metaTitle || 'Product name | Price in Nepal'}</div>
                <div className="serp-snippet">
                  {formData.metaDescription || 'Add a 140-160 character benefit-led description with a call to action.'}
                </div>
              </div>
              <div className="admin-card">
                <div className="admin-card-header">
                  <h3 className="admin-card-title">Content checklist</h3>
                </div>
                <div className="admin-card-body">
                  <p>{titleLength >= 50 && titleLength <= 65 ? '✓' : '○'} Title is about 60 characters</p>
                  <p>{descriptionLength >= 140 && descriptionLength <= 160 ? '✓' : '○'} Description is 140-160 characters</p>
                  <p>{formData.h1 ? '✓' : '○'} One product-name H1 is defined</p>
                  <p>{productDescriptionLength >= 100 ? '✓' : '○'} Original description has at least 100 words</p>
                  <p>{formData.faq.trim() ? '✓' : '○'} Sizing, delivery, and exchange FAQs are present</p>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
