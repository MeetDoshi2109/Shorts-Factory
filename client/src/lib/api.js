// client/src/lib/api.js
import { supabase } from './supabase'

const API_BASE = '/api'

// Helper to get the JWT token for the current user
async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
  };
}

async function fetcher(url, options = {}) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: { ...headers, ...options.headers }
  })
  if (!res.ok) {
    let msg = res.statusText
    try { const err = await res.json(); msg = err.error || err.message || msg } catch {}
    throw new Error(msg)
  }
  return res.json()
}

export const api = {
  settings: {
    get: () => fetcher('/settings'),
    update: (data) => fetcher('/settings', { method: 'PUT', body: JSON.stringify(data) }),
    authYoutube: () => fetcher('/settings/auth-youtube', { method: 'POST' }),
  },
  pipeline: {
    runs: (limit = 20) => fetcher(`/pipeline/runs?limit=${limit}`),
    run: () => fetcher('/pipeline/run', { method: 'POST' }),
    logsUrl: () => `${API_BASE}/pipeline/logs`, // Note: SSE auth is tricky, bypassing for now
  },
  topics: {
    list: () => fetcher('/topics'),
    add: (text) => fetcher('/topics', { method: 'POST', body: JSON.stringify({ text }) }),
    remove: (id) => fetcher(`/topics/${id}`, { method: 'DELETE' }),
    generate: (niche) => fetcher('/topics/generate', { method: 'POST', body: JSON.stringify({ niche }) }),
  },
  analytics: {
    get: (days = 28, force = false) => fetcher(`/analytics?days=${days}&force=${force}`),
    videos: (limit = 50) => fetcher(`/analytics/videos?limit=${limit}`),
  }
}

export const fmt = (num) => new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(num || 0)
export const fmtDate = (str) => {
  if (!str) return ''
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
export const fmtRelative = (str) => {
  if (!str) return ''
  const diff = Date.now() - new Date(str).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
