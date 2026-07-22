import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Save, Sliders, Palette, Zap, Plus,
  X, ChevronRight, Loader2, Check
} from 'lucide-react'
import PageTransition from '../components/PageTransition'
import { api } from '../lib/api'
import toast from 'react-hot-toast'

const PALETTES = [
  { name: 'YouTube Red', bg: '#0a0a0a', accent: '#FF0000' },
  { name: 'Ocean Blue',  bg: '#050A1A', accent: '#4A90E2' },
  { name: 'Emerald',     bg: '#050F07', accent: '#00C853' },
  { name: 'Purple',      bg: '#0D0014', accent: '#9C27B0' },
  { name: 'Gold',        bg: '#0D0900', accent: '#FFD600' },
  { name: 'Teal',        bg: '#001A1A', accent: '#00BCD4' },
]

export default function Studio() {
  const [settings, setSettings] = useState({})
  const [topics, setTopics] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [genLoading, setGenLoading] = useState(false)
  const [newTopic, setNewTopic] = useState('')
  const [selectedPalette, setSelectedPalette] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, t] = await Promise.allSettled([api.settings.get(), api.topics.list()])
      if (s.status === 'fulfilled') setSettings(s.value)
      if (t.status === 'fulfilled') setTopics(t.value)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const saveSettings = async () => {
    setSaving(true)
    try {
      await api.settings.update({
        CHANNEL_NICHE: settings.CHANNEL_NICHE,
        CHANNEL_TARGET_AUDIENCE: settings.CHANNEL_TARGET_AUDIENCE,
        UPLOAD_PRIVACY: settings.UPLOAD_PRIVACY,
        DAILY_UPLOAD_COUNT: settings.DAILY_UPLOAD_COUNT,
        VIDEO_DURATION_MAX: settings.VIDEO_DURATION_MAX,
        VIDEO_PALETTE: String(selectedPalette),
      })
      toast.success('Preferences saved!')
    } catch (e) { toast.error(e.message) }
    setSaving(false)
  }

  const addTopic = async () => {
    if (!newTopic.trim()) return
    try {
      const t = await api.topics.add(newTopic.trim())
      setTopics(prev => [t, ...prev])
      setNewTopic('')
      toast.success('Topic added to queue!')
    } catch (e) { toast.error(e.message) }
  }

  const removeTopic = async (id) => {
    try {
      await api.topics.remove(id)
      setTopics(prev => prev.filter(t => t.id !== id))
      toast.success('Topic removed')
    } catch {}
  }

  const generateSuggestions = async () => {
    setGenLoading(true)
    try {
      const data = await api.topics.generate(settings.CHANNEL_NICHE || 'personal finance')
      setSuggestions(data.ideas || [])
    } catch (e) { toast.error(e.message) }
    setGenLoading(false)
  }

  const addSuggestion = async (topic) => {
    await api.topics.add(topic)
    setTopics(prev => [{ id: Date.now(), text: topic, used: false }, ...prev])
    setSuggestions(prev => prev.filter(s => s.topic !== topic))
    toast.success('Added to queue!')
  }

  return (
    <PageTransition>
      <div className="mb-7">
        <h1 className="text-headline font-bold text-white">Studio</h1>
        <p className="text-caption text-on-surface/40 mt-1">Video preferences and content planning</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* ── LEFT: Preferences ──────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="glass p-5">
            <h2 className="text-headline-sm font-semibold text-white mb-5 flex items-center gap-2">
              <Sliders size={17} className="text-yt-red" /> Video Preferences
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-caption text-on-surface/50 mb-1.5 block font-medium">Channel Niche</label>
                <input className="input" placeholder="e.g. personal finance, cooking, tech tips"
                  value={settings.CHANNEL_NICHE || ''} onChange={e => setSettings(s => ({ ...s, CHANNEL_NICHE: e.target.value }))} />
              </div>
              <div>
                <label className="text-caption text-on-surface/50 mb-1.5 block font-medium">Target Audience</label>
                <input className="input" placeholder="e.g. young adults 18-35"
                  value={settings.CHANNEL_TARGET_AUDIENCE || ''} onChange={e => setSettings(s => ({ ...s, CHANNEL_TARGET_AUDIENCE: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-caption text-on-surface/50 mb-1.5 block font-medium">Upload Privacy</label>
                  <select className="input" value={settings.UPLOAD_PRIVACY || 'public'} onChange={e => setSettings(s => ({ ...s, UPLOAD_PRIVACY: e.target.value }))}>
                    <option value="public">Public</option>
                    <option value="unlisted">Unlisted</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                <div>
                  <label className="text-caption text-on-surface/50 mb-1.5 block font-medium">Daily Uploads</label>
                  <select className="input" value={settings.DAILY_UPLOAD_COUNT || '3'} onChange={e => setSettings(s => ({ ...s, DAILY_UPLOAD_COUNT: e.target.value }))}>
                    {[1,2,3,5].map(n => <option key={n} value={n}>{n}x per day</option>)}
                  </select>
                </div>
              </div>

              {/* Max Duration Slider */}
              <div>
                <label className="text-caption text-on-surface/50 mb-1.5 flex justify-between font-medium">
                  <span>Max Duration</span>
                  <span className="font-mono text-yt-red">{settings.VIDEO_DURATION_MAX || 58}s</span>
                </label>
                <input type="range" min="30" max="60" step="1"
                  value={settings.VIDEO_DURATION_MAX || 58}
                  onChange={e => setSettings(s => ({ ...s, VIDEO_DURATION_MAX: e.target.value }))}
                  className="w-full accent-red-500 cursor-pointer" />
                <div className="flex justify-between text-label text-on-surface/30 font-mono">
                  <span>30s</span><span>60s</span>
                </div>
              </div>
            </div>
          </div>

          {/* Color Palette */}
          <div className="glass p-5">
            <h2 className="text-headline-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Palette size={17} className="text-yt-red" /> Video Color Palette
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {PALETTES.map((p, i) => (
                <motion.button key={i} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedPalette(i)}
                  className={`relative p-3 rounded-lg border transition-all ${selectedPalette === i ? 'border-yt-red' : 'border-surface-high'}`}
                  style={{ background: p.bg }}
                >
                  <div className="w-full h-3 rounded-full mb-2" style={{ background: p.accent }} />
                  <p className="text-label text-white/70">{p.name}</p>
                  {selectedPalette === i && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                      className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-yt-red flex items-center justify-center"
                    >
                      <Check size={10} className="text-white" />
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          <motion.button whileTap={{ scale: 0.97 }} onClick={saveSettings} disabled={saving}
            className="btn btn-primary w-full justify-center disabled:opacity-50"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Saving…' : 'Save Preferences'}
          </motion.button>
        </div>

        {/* ── RIGHT: Topics & Suggestions ────────────────────────────── */}
        <div className="space-y-4">

          {/* AI Suggestions */}
          <div className="glass p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-headline-sm font-semibold text-white flex items-center gap-2">
                <Sparkles size={17} className="text-yt-red" /> Video Suggestions
              </h2>
              <motion.button whileTap={{ scale: 0.95 }} onClick={generateSuggestions} disabled={genLoading}
                className="btn btn-primary btn-sm disabled:opacity-50"
              >
                {genLoading ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                Generate 5 Ideas
              </motion.button>
            </div>

            {suggestions.length === 0 && !genLoading && (
              <div className="text-center py-6">
                <Sparkles size={28} className="text-on-surface/20 mx-auto mb-2" />
                <p className="text-caption text-on-surface/30">Click Generate to get AI-powered topic ideas for your niche</p>
              </div>
            )}
            {genLoading && <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-14 rounded-lg" />)}</div>}

            <div className="space-y-2">
              <AnimatePresence>
                {suggestions.map((s, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
                    transition={{ delay: i * 0.06 }}
                    className="flex items-start gap-3 p-3 rounded-lg border border-surface-high hover:border-yt-red/30 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-caption font-medium text-on-surface/80 mb-0.5">{s.topic}</p>
                      <p className="text-label text-on-surface/40 italic truncate">"{s.hook}"</p>
                    </div>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => addSuggestion(s.topic)}
                      className="btn btn-secondary btn-sm flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Plus size={12} /> Add
                    </motion.button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Topic Backlog */}
          <div className="glass p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-headline-sm font-semibold text-white">Topic Queue</h2>
              <span className="badge badge-blue">{topics.filter(t => !t.used).length} pending</span>
            </div>

            <div className="flex gap-2 mb-4">
              <input className="input text-caption" placeholder="Add a topic manually…"
                value={newTopic} onChange={e => setNewTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTopic()} />
              <motion.button whileTap={{ scale: 0.95 }} onClick={addTopic} className="btn btn-primary btn-sm flex-shrink-0">
                <Plus size={13} /> Add
              </motion.button>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1.5 scrollbar-hide">
              {loading && <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-8 rounded-lg" />)}</div>}
              <AnimatePresence>
                {topics.map((t) => (
                  <motion.div key={t.id}
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 p-2 rounded-lg border border-surface-high group hover:border-yt-red/30 transition-colors"
                  >
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.used ? 'bg-on-surface/20' : 'bg-success'}`} />
                    <span className={`text-caption flex-1 truncate ${t.used ? 'text-on-surface/30 line-through' : 'text-on-surface/70'}`}>
                      {t.text}
                    </span>
                    <button onClick={() => removeTopic(t.id)}
                      className="text-on-surface/20 hover:text-yt-red transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X size={13} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              {!loading && topics.length === 0 && (
                <p className="text-caption text-on-surface/30 text-center py-4">No topics yet. Add one above!</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
