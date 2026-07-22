// src/lib/api.js — Typed API client for the Express server
const BASE = '/api'

async function req(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(BASE + path, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  // Health
  health: () => req('GET', '/health'),

  // Pipeline
  pipeline: {
    status: () => req('GET', '/pipeline/status'),
    run: (body) => req('POST', '/pipeline/run', body),
    runs: (limit = 50) => req('GET', `/pipeline/runs?limit=${limit}`),
    logsUrl: () => BASE + '/pipeline/logs',
  },

  // Topics
  topics: {
    list: () => req('GET', '/topics'),
    add: (text) => req('POST', '/topics', { text }),
    remove: (id) => req('DELETE', `/topics/${id}`),
    generate: (niche) => req('POST', '/topics/generate', { niche }),
  },

  // Analytics
  analytics: {
    get: (days = 28, force = false) => req('GET', `/analytics?days=${days}&force=${force}`),
    videos: (limit = 50) => req('GET', `/analytics/videos?limit=${limit}`),
  },

  // Settings
  settings: {
    get: () => req('GET', '/settings'),
    update: (data) => req('PUT', '/settings', data),
    authYoutube: () => req('POST', '/settings/auth-youtube'),
  },
}

// ── Number formatters ──────────────────────────────────────────────────────
export const fmt = (n) => {
  n = Number(n) || 0
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString()
}

export const fmtDate = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export const fmtRelative = (iso) => {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export const fmtDuration = (seconds) => {
  if (!seconds) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
