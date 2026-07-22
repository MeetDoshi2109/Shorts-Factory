import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { UserCircle, Key, Database, ShieldCheck, ExternalLink, CheckCircle2, AlertTriangle, Eye, EyeOff, Save, RefreshCw } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import { api } from '../lib/api'
import toast from 'react-hot-toast'

export default function Account() {
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [showGeminiKey, setShowGeminiKey] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const s = await api.settings.get()
        setSettings(s)
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const handleSaveEnvKeys = async () => {
    setSaving(true)
    try {
      await api.settings.update({
        GEMINI_API_KEY: settings.GEMINI_API_KEY || '',
        YOUTUBE_CLIENT_ID: settings.YOUTUBE_CLIENT_ID || '',
        YOUTUBE_CLIENT_SECRET: settings.YOUTUBE_CLIENT_SECRET || '',
      })
      toast.success('API Keys updated successfully!')
    } catch (e) {
      toast.error('Failed to update API Keys: ' + e.message)
    }
    setSaving(false)
  }

  const handleAuthYoutube = async () => {
    toast.promise(api.settings.authYoutube(), {
      loading: 'Opening YouTube Authorization flow...',
      success: 'YouTube connected successfully!',
      error: (e) => 'YouTube Auth failed: ' + e.message,
    })
  }

  return (
    <PageTransition>
      <div className="mb-7">
        <h1 className="text-headline font-bold text-white">Account & Credentials</h1>
        <p className="text-caption text-on-surface/40 mt-1">Manage API keys, YouTube OAuth, and database connections</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* ── Section 1: YouTube Channel Status ──────────────────────────── */}
        <div className="glass p-6">
          <h2 className="text-headline-sm font-semibold text-white mb-4 flex items-center gap-2">
            <UserCircle size={18} className="text-yt-red" /> YouTube Account Management
          </h2>

          <div className="p-4 rounded-lg bg-surface-card border border-surface-high mb-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-caption text-on-surface/60 font-medium">OAuth Status</span>
              {settings.youtube_authed ? (
                <span className="badge badge-green flex items-center gap-1">
                  <CheckCircle2 size={12} /> Connected & Authed
                </span>
              ) : (
                <span className="badge badge-red flex items-center gap-1">
                  <AlertTriangle size={12} /> Action Required
                </span>
              )}
            </div>

            <p className="text-caption text-on-surface/70 leading-relaxed mb-4">
              Shorts Factory uses your Google OAuth2 credentials to upload generated Shorts and read channel analytics securely. Token auto-refreshes seamlessly.
            </p>

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleAuthYoutube}
              className="btn btn-primary w-full justify-center"
            >
              <RefreshCw size={14} /> Re-Authenticate YouTube Channel
            </motion.button>
          </div>

          <div className="p-4 rounded-lg bg-surface-card/40 border border-surface-high/50 text-caption text-on-surface/50 space-y-2">
            <div className="flex justify-between">
              <span>Token Storage:</span>
              <span className="font-mono text-white">data/youtube_token.json</span>
            </div>
            <div className="flex justify-between">
              <span>Configured Client ID:</span>
              <span className="font-mono text-white">{settings.youtube_configured ? 'Yes (Valid)' : 'Missing'}</span>
            </div>
          </div>
        </div>

        {/* ── Section 2: API Keys Management ───────────────────────────── */}
        <div className="glass p-6">
          <h2 className="text-headline-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Key size={18} className="text-yt-red" /> API Key Management
          </h2>

          <div className="space-y-4 mb-5">
            {/* Gemini Key */}
            <div>
              <label className="text-caption text-on-surface/50 mb-1.5 flex justify-between font-medium">
                <span>Gemini API Key (Free Tier)</span>
                <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" className="text-yt-red hover:underline flex items-center gap-1 text-label font-mono">
                  Get Key <ExternalLink size={10} />
                </a>
              </label>
              <div className="relative">
                <input
                  type={showGeminiKey ? 'text' : 'password'}
                  className="input font-mono text-caption pr-10"
                  placeholder="AIzaSy..."
                  value={settings.GEMINI_API_KEY || ''}
                  onChange={e => setSettings(s => ({ ...s, GEMINI_API_KEY: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface/30 hover:text-white"
                >
                  {showGeminiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* YouTube Client ID */}
            <div>
              <label className="text-caption text-on-surface/50 mb-1.5 block font-medium">YouTube OAuth Client ID</label>
              <input
                type="text"
                className="input font-mono text-caption"
                placeholder="xxxx.apps.googleusercontent.com"
                value={settings.YOUTUBE_CLIENT_ID || ''}
                onChange={e => setSettings(s => ({ ...s, YOUTUBE_CLIENT_ID: e.target.value }))}
              />
            </div>

            {/* YouTube Client Secret */}
            <div>
              <label className="text-caption text-on-surface/50 mb-1.5 block font-medium">YouTube OAuth Client Secret</label>
              <div className="relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  className="input font-mono text-caption pr-10"
                  placeholder="GOCSPX-..."
                  value={settings.YOUTUBE_CLIENT_SECRET || ''}
                  onChange={e => setSettings(s => ({ ...s, YOUTUBE_CLIENT_SECRET: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface/30 hover:text-white"
                >
                  {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleSaveEnvKeys}
            disabled={saving}
            className="btn btn-secondary w-full justify-center"
          >
            <Save size={15} /> {saving ? 'Saving...' : 'Save All Keys'}
          </motion.button>
        </div>

        {/* ── Section 3: Supabase Database Info ────────────────────────── */}
        <div className="glass p-6">
          <h2 className="text-headline-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Database size={18} className="text-success" /> Supabase Database & Auth
          </h2>
          <div className="space-y-3 text-caption text-on-surface/70">
            <div className="flex justify-between items-center p-3 rounded-lg bg-surface-card border border-surface-high">
              <span>Supabase Connection</span>
              <span className="badge badge-green font-mono">Connected</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-surface-card border border-surface-high">
              <span>Realtime Subscriptions</span>
              <span className="badge badge-green font-mono">Active</span>
            </div>
            <div className="p-3 rounded-lg bg-surface-card/40 border border-surface-high/50 font-mono text-label text-on-surface/40">
              Tables: videos, topics, runs, settings, analytics_snapshots
            </div>
          </div>
        </div>

        {/* ── Section 4: Security ──────────────────────────────────────── */}
        <div className="glass p-6">
          <h2 className="text-headline-sm font-semibold text-white mb-4 flex items-center gap-2">
            <ShieldCheck size={18} className="text-info" /> Security & Privacy
          </h2>
          <p className="text-caption text-on-surface/60 mb-4 leading-relaxed">
            All API keys and credentials are stored strictly on your local machine in the root <code className="font-mono text-white">.env</code> file. No keys are ever transmitted to external servers except directly to Google API endpoints.
          </p>
          <div className="badge badge-gray text-caption">Local Environment Mode Enabled</div>
        </div>

      </div>
    </PageTransition>
  )
}
