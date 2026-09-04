const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const auth = token ?? getToken();
  if (auth) headers.Authorization = `Bearer ${auth}`;

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    const err = new Error('Unable to reach the server. Please try again.');
    err.code = 'NETWORK_ERROR';
    throw err;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || `Request failed (${res.status})`);
    err.code = data.code || 'REQUEST_FAILED';
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  resetPassword: (payload) => request('/auth/reset-password', { method: 'POST', body: payload }),
  me: () => request('/auth/me'),
  getPreferences: () => request('/preferences'),
  savePreferences: (payload) => request('/preferences', { method: 'PUT', body: payload }),
  getDashboard: (refresh = false) => request(`/dashboard${refresh ? '?refresh=1' : ''}`),
  sendFeedback: (payload) => request('/feedback', { method: 'POST', body: payload }),
};
