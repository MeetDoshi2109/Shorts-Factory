import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Settings as SettingsIcon, Target, Bell, Terminal, Save, Copy } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import { api } from '../lib/api'
import toast from 'react-hot-toast'

export default function Settings() {
  const [settings, setSettings] = useState({
    TARGET_SUBS: '1000',
    TARGET_VIEWS: '100000',
    TARGET_UPLOADS: '30',
    NOTIFY_EMAIL: '',
    NOTIFY_ON_FAILURE: 'true',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const data = await api.settings.get()
        setSettings(prev => ({ ...prev, ...data }))
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.settings.update(settings)
      toast.success('Settings saved!')
    } catch (e) {
      toast.error('Failed to save settings: ' + e.message)
    }
    setSaving(false)
  }

  const copyScheduler = () => {
    const cmd = `schtasks /create /tn "ShortsFactory_Daily" /tr "C:\\Users\\Asus\\OneDrive\\Desktop\\Shorts Factory\\run_daily.bat" /sc daily /st 12:00 /f`
    navigator.clipboard.writeText(cmd)
    toast.success('Scheduler command copied!')
  }

  return (
    <PageTransition>
      <div className="mb-7">
        <h1 className="text-headline font-bold text-white">System Settings</h1>
        <p className="text-caption text-on-surface/40 mt-1">Configure goals, target metrics, and notifications</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* ── Channel Target Milestones ───────────────────────────────────── */}
        <div className="glass p-6">
          <h2 className="text-headline-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Target size={18} className="text-yt-red" /> Target Milestones & Goals
          </h2>
          <p className="text-caption text-on-surface/50 mb-5">Set target milestones to track dashboard progress bars.</p>

          <div className="space-y-4 mb-6">
            <div>
              <label className="text-caption text-on-surface/50 mb-1.5 block font-medium">Subscribers Target Goal</label>
              <input
                type="number"
                className="input font-mono text-caption"
                value={settings.TARGET_SUBS || '1000'}
                onChange={e => setSettings(s => ({ ...s, TARGET_SUBS: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-caption text-on-surface/50 mb-1.5 block font-medium">Total Channel Views Goal</label>
              <input
                type="number"
                className="input font-mono text-caption"
                value={settings.TARGET_VIEWS || '100000'}
                onChange={e => setSettings(s => ({ ...s, TARGET_VIEWS: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-caption text-on-surface/50 mb-1.5 block font-medium">Monthly Shorts Upload Goal</label>
              <input
                type="number"
                className="input font-mono text-caption"
                value={settings.TARGET_UPLOADS || '30'}
                onChange={e => setSettings(s => ({ ...s, TARGET_UPLOADS: e.target.value }))}
              />
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary w-full justify-center"
          >
            <Save size={15} /> {saving ? 'Saving...' : 'Save Goals'}
          </motion.button>
        </div>

        {/* ── Notification & Alert Settings ─────────────────────────────── */}
        <div className="glass p-6">
          <h2 className="text-headline-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Bell size={18} className="text-warning" /> Email & Pipeline Alerts
          </h2>

          <div className="space-y-4 mb-6">
            <div>
              <label className="text-caption text-on-surface/50 mb-1.5 block font-medium">Notification Email Address</label>
              <input
                type="email"
                className="input text-caption"
                placeholder="your-email@example.com"
                value={settings.NOTIFY_EMAIL || ''}
                onChange={e => setSettings(s => ({ ...s, NOTIFY_EMAIL: e.target.value }))}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-card border border-surface-high">
              <div>
                <div className="text-caption text-white font-medium">Pipeline Failure Alerts</div>
                <div className="text-label text-on-surface/40">Receive email if a generation or upload fails</div>
              </div>
              <input
                type="checkbox"
                className="w-4 h-4 accent-red-500 rounded cursor-pointer"
                checked={settings.NOTIFY_ON_FAILURE === 'true'}
                onChange={e => setSettings(s => ({ ...s, NOTIFY_ON_FAILURE: e.target.checked ? 'true' : 'false' }))}
              />
            </div>
          </div>

          {/* Quick Scheduler Info */}
          <div className="p-4 rounded-lg bg-surface-card border border-surface-high">
            <div className="flex items-center justify-between mb-2">
              <span className="text-caption font-semibold text-white flex items-center gap-1.5">
                <Terminal size={14} className="text-yt-red" /> Windows Scheduler Shortcut
              </span>
              <button onClick={copyScheduler} className="btn btn-ghost btn-sm text-label">
                <Copy size={12} /> Copy
              </button>
            </div>
            <p className="text-label text-on-surface/40 font-mono break-all">
              schtasks /create /tn "ShortsFactory_Daily" /tr "C:\Users\Asus\OneDrive\Desktop\Shorts Factory\run_daily.bat" /sc daily /st 12:00 /f
            </p>
          </div>
        </div>

      </div>
    </PageTransition>
  )
}
