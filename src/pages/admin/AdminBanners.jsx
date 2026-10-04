import { useEffect, useState } from 'react';
import { api } from '../../api.js';

export default function AdminBanners() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [alt, setAlt] = useState('');
  const [link, setLink] = useState('');
  const [imageError, setImageError] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyBanner, setBusyBanner] = useState('');
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');
    api.get('/admin/banners')
      .then((data) => {
        if (active) setBanners(data.banners || []);
      })
      .catch((err) => {
        if (active) setLoadError(err.message || 'Could not load homepage banners.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [attempt]);

  useEffect(() => {
    if (!imageFile) {
      setPreview('');
      return undefined;
    }
    const objectUrl = URL.createObjectURL(imageFile);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  const showNotice = (message, type = 'success') => {
    setNotice({ message, type });
    window.setTimeout(() => setNotice(null), 3500);
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] || null;
    setImageError('');
    if (!file) {
      setImageFile(null);
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setImageError('Choose a JPG, PNG, or WEBP image.');
      event.target.value = '';
      setImageFile(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError('Banner image must be 5MB or smaller.');
      event.target.value = '';
      setImageFile(null);
      return;
    }
    setImageFile(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!imageFile) {
      setImageError('Choose a banner image to upload.');
      return;
    }

    const form = new FormData();
    form.append('image', imageFile);
    form.append('alt', alt.trim());
    form.append('link', link.trim());
    try {
      setSaving(true);
      const data = await api.post('/admin/banners', form);
      setBanners((current) => [...current, data.banner]);
      setImageFile(null);
      setAlt('');
      setLink('');
      const input = document.getElementById('banner-image');
      if (input) input.value = '';
      showNotice('Banner added to the homepage carousel.');
    } catch (err) {
      showNotice(err.message || 'Could not upload the banner.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleBanner = async (banner) => {
    setBusyBanner(banner._id);
    try {
      const data = await api.patch(`/admin/banners/${banner._id}/status`, { isActive: !banner.isActive });
      setBanners((current) => current.map((item) => (item._id === banner._id ? data.banner : item)));
      showNotice(data.banner.isActive ? 'Banner is now visible on the homepage.' : 'Banner is now hidden.');
    } catch (err) {
      showNotice(err.message || 'Could not update the banner.', 'error');
    } finally {
      setBusyBanner('');
    }
  };

  const deleteBanner = async (banner) => {
    if (!window.confirm('Remove this banner from the carousel?')) return;
    setBusyBanner(banner._id);
    try {
      await api.delete(`/admin/banners/${banner._id}`);
      setBanners((current) => current.filter((item) => item._id !== banner._id));
      showNotice('Banner removed.');
    } catch (err) {
      showNotice(err.message || 'Could not remove the banner.', 'error');
    } finally {
      setBusyBanner('');
    }
  };

  return (
    <div className="slide-up admin-banners">
      {notice && (
        <div className={`admin-toast ${notice.type}`} role="status">
          <span>{notice.type === 'success' ? '✓' : '⚠'}</span>
          <span>{notice.message}</span>
        </div>
      )}

      <div className="admin-page-header">
        <div className="admin-page-title">
          <h1>Homepage Banners</h1>
          <p>Upload promotional images for the rotating homepage banner. Use wide landscape images for best results.</p>
        </div>
      </div>

      <section className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">Add a banner</h2>
        </div>
        <form className="admin-card-body banner-upload-form" onSubmit={handleSubmit}>
          <label className="banner-file-field" htmlFor="banner-image">
            <span>Banner image <span aria-hidden="true">*</span></span>
            <input id="banner-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} />
            <small>JPG, PNG, or WEBP · max 5MB</small>
            {imageError && <span className="banner-form-error" role="alert">{imageError}</span>}
          </label>

          {preview && <img className="banner-upload-preview" src={preview} alt="Selected banner preview" />}

          <div className="banner-form-fields">
            <label>
              Image description
              <input
                type="text"
                maxLength={200}
                value={alt}
                onChange={(event) => setAlt(event.target.value)}
                placeholder="Example: Summer collection promotion"
              />
            </label>
            <label>
              Optional click-through link
              <input
                type="text"
                maxLength={500}
                value={link}
                onChange={(event) => setLink(event.target.value)}
                placeholder="/?category=Running or https://example.com"
              />
            </label>
          </div>
          <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
            {saving ? 'Uploading banner…' : 'Upload banner'}
          </button>
        </form>
      </section>

      <section className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">Carousel banners <span className="admin-pill pill-orange">{banners.length}</span></h2>
        </div>
        {loading ? (
          <div className="admin-users-state" role="status">Loading banners…</div>
        ) : loadError ? (
          <div className="admin-users-state" role="alert">
            <p>{loadError}</p>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setAttempt((value) => value + 1)}>Retry</button>
          </div>
        ) : banners.length === 0 ? (
          <div className="admin-users-state">
            <h3>No banners yet</h3>
            <p>Add a banner above and it will appear on the homepage.</p>
          </div>
        ) : (
          <div className="banner-admin-list">
            {banners.map((banner, index) => (
              <article className="banner-admin-item" key={banner._id}>
                <img src={banner.image} alt={banner.alt || `Homepage banner ${index + 1}`} />
                <div className="banner-admin-details">
                  <strong>Banner {index + 1}</strong>
                  <span>{banner.alt || 'No image description'}</span>
                  {banner.link && <small>{banner.link}</small>}
                  <span className={`admin-pill ${banner.isActive ? 'pill-green' : 'pill-gray'}`}>
                    {banner.isActive ? 'Visible' : 'Hidden'}
                  </span>
                </div>
                <div className="banner-admin-actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary admin-btn-sm"
                    disabled={busyBanner === banner._id}
                    onClick={() => toggleBanner(banner)}
                  >{banner.isActive ? 'Hide' : 'Show'}</button>
                  <button
                    type="button"
                    className="admin-btn admin-btn-danger admin-btn-sm"
                    disabled={busyBanner === banner._id}
                    onClick={() => deleteBanner(banner)}
                  >Remove</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
