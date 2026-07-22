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
        // Map database columns to local state
        setSettings({
          ...s,
          GEMINI_API_KEY: s.gemini_api_key || '',
          YOUTUBE_CLIENT_ID: s.youtube_client_id || '',
          YOUTUBE_CLIENT_SECRET: s.youtube_client_secret || ''
        })
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const handleSaveEnvKeys = async () => {
    setSaving(true)
    try {
      await api.settings.update({
        gemini_api_key: settings.GEMINI_API_KEY || '',
        youtube_client_id: settings.YOUTUBE_CLIENT_ID || '',
        youtube_client_secret: settings.YOUTUBE_CLIENT_SECRET || '',
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

        {/* ── Section 1: API Keys Management ───────────────────────────── */}
        <div className="glass p-6 xl:col-span-2">
          <h2 className="text-headline-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Key size={18} className="text-yt-red" /> Personal API Keys
          </h2>
          <p className="text-caption text-on-surface/50 mb-5">These keys are linked exclusively to your user account and are used to power AI generation and YouTube publishing.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
            <div className="space-y-4">
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
            </div>

            <div className="space-y-4">
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
          </div>

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleSaveEnvKeys}
            disabled={saving}
            className="btn btn-secondary w-full md:w-auto px-8 justify-center"
          >
            <Save size={15} /> {saving ? 'Saving...' : 'Save Keys to Profile'}
          </motion.button>
        </div>

        {/* ── Section 2: Security ──────────────────────────────────────── */}
        <div className="glass p-6 xl:col-span-2">
          <h2 className="text-headline-sm font-semibold text-white mb-4 flex items-center gap-2">
            <ShieldCheck size={18} className="text-info" /> Cloud Security & Privacy
          </h2>
          <p className="text-caption text-on-surface/60 mb-4 leading-relaxed">
            Your API keys and credentials are stored securely in the cloud database. Row Level Security (RLS) ensures that only your authenticated user account can read or use these keys. They are never transmitted to external servers except directly to Google API endpoints for rendering and uploading.
          </p>
          <div className="badge badge-green text-caption">Multi-Tenant Cloud Mode Enabled</div>
        </div>

      </div>
    </PageTransition>
  )
}
