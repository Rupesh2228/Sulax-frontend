const HOST = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const BASE = `${HOST}/api`;

export const imgUrl = (name) => {
  if (!name) return '';
  if (name.startsWith('http://') || name.startsWith('https://') || name.startsWith('data:')) return name;
  return `${HOST}/uploads/${encodeURIComponent(name)}`;
};
export const money = (n) => Number(n || 0).toFixed(2);

export class ApiError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

// CSRF token is kept in memory only (never in localStorage) and sent as a header.
let csrfToken = null;
async function ensureCsrf(force = false) {
  if (csrfToken && !force) return csrfToken;
  const res = await fetch(`${BASE}/csrf`, { credentials: 'include' });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.message || 'Could not prepare a secure request.');
  if (typeof data?.csrfToken !== 'string' || !data.csrfToken) {
    throw new ApiError(res.status, 'The server returned an invalid security token response.');
  }
  csrfToken = data.csrfToken;
  return csrfToken;
}

async function request(path, { method = 'GET', body, form } = {}, retried = false) {
  const headers = {};
  if (method !== 'GET') headers['X-CSRF-Token'] = await ensureCsrf();
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('sulax_token') : null;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let payload;
  if (form) {
    payload = form;
  } else if (body !== undefined) {
    if (typeof FormData !== 'undefined' && body instanceof FormData) {
      payload = body;
    } else {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
  }

  const res = await fetch(BASE + path, { method, headers, credentials: 'include', body: payload });
  const data = await res.json().catch(() => null);

  // Token expired/rotated -> fetch a fresh one and retry once
  if (res.status === 403 && /csrf/i.test(data?.message || '') && !retried) {
    await ensureCsrf(true);
    return request(path, { method, body, form }, true);
  }
  if (!res.ok) throw new ApiError(res.status, data?.message || `Request failed (${res.status}).`, data?.errors);
  if (!data || typeof data !== 'object') {
    throw new ApiError(res.status, 'The server returned an invalid response.');
  }
  return data;
}

export const api = {
  get: (p) => request(p),
  post: (p, body, opts) => request(p, { method: 'POST', body, ...opts }),
  put: (p, body, opts) => request(p, { method: 'PUT', body, ...opts }),
  patch: (p, body, opts) => request(p, { method: 'PATCH', body, ...opts }),
  delete: (p, opts) => request(p, { method: 'DELETE', ...opts }),
  del: (p, opts) => request(p, { method: 'DELETE', ...opts }),
};
