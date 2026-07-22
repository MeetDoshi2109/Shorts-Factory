import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye, Users, Clock, Upload, Rocket, RefreshCw,
  PlusCircle, TrendingUp, Target, Zap, ChevronRight,
  CheckCircle, XCircle, Loader2
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import PageTransition from '../components/PageTransition'
import StatCard from '../components/StatCard'
import { api, fmt, fmtDate, fmtRelative } from '../lib/api'
import { usePipeline } from '../App'
import toast from 'react-hot-toast'

const STATUS_COLORS = {
  success: 'badge-green', failed: 'badge-red',
  running: 'badge-yellow', pending: 'badge-gray',
}
const STATUS_ICONS = {
  success: CheckCircle, failed: XCircle,
  running: Loader2, pending: Clock,
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass px-3 py-2 text-caption">
      <p className="text-on-surface/50 mb-1">{label}</p>
      <p className="font-mono font-semibold text-yt-red">{fmt(payload[0]?.value)} views</p>
    </div>
  )
}

export default function Dashboard() {
  const { running, runPipeline } = usePipeline()
  const [analytics, setAnalytics] = useState(null)
  const [runs, setRuns] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [targets, setTargets] = useState([])
  const [loading, setLoading] = useState(true)
  const [genLoading, setGenLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [a, r, s] = await Promise.allSettled([
        api.analytics.get(28),
        api.pipeline.runs(5),
        api.settings.get(),
      ])
      if (a.status === 'fulfilled') setAnalytics(a.value)
      if (r.status === 'fulfilled') setRuns(r.value)
      if (s.status === 'fulfilled') {
        const st = s.value
        setTargets([
          { label: 'Subscribers', current: a.value?.channel_info?.total_subscribers || 0, target: Number(st.TARGET_SUBS || 1000), color: 'green' },
          { label: 'Total Views',  current: a.value?.channel_info?.total_views || 0,       target: Number(st.TARGET_VIEWS || 100000), color: 'blue' },
          { label: 'Monthly Uploads', current: a.value?.total_videos_month || 0,            target: Number(st.TARGET_UPLOADS || 30), color: 'yellow' },
        ])
      }
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const generateSuggestions = async () => {
    setGenLoading(true)
    try {
      const s = await api.settings.get()
      const data = await api.topics.generate(s.CHANNEL_NICHE || 'personal finance')
      setSuggestions(data.ideas || [])
    } catch (e) { toast.error(e.message) }
    setGenLoading(false)
  }

  const useSuggestion = async (topic) => {
    await api.topics.add(topic)
    toast.success('Added to topic queue!')
    runPipeline({ topic }).then(() => toast.success('Pipeline started!')).catch(e => toast.error(e.message))
  }

  const ch = analytics?.channel_info || {}
  const totals = analytics?.totals || {}
  const dailyViews = (analytics?.daily_views || []).map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    views: d.views,
  }))

  const stagger = { animate: { transition: { staggerChildren: 0.07 } } }
  const cardFade = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } }

  return (
    <PageTransition>
      {/* ── Page Header ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-headline font-bold text-white">Dashboard</h1>
          <p className="text-caption text-on-surface/40 mt-1">Your Shorts Factory command center</p>
        </div>
        <div className="flex gap-2">
          <motion.button whileTap={{ scale: 0.96 }} onClick={load} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} /> Refresh
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => runPipeline({}).then(() => toast.success('Pipeline started!')).catch(e => toast.error(e.message))}
            disabled={running}
            className="btn btn-primary btn-sm disabled:opacity-50"
          >
            <Rocket size={14} /> {running ? 'Running…' : 'Run Pipeline'}
          </motion.button>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────── */}
      <motion.div variants={stagger} initial="initial" animate="animate"
        className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6"
      >
        {[
          { title: 'Total Views', value: totals.views, delta: totals.views_delta, icon: Eye, color: 'red' },
          { title: 'Subscribers', value: ch.total_subscribers, delta: totals.subs_gained, deltaLabel: 'gained', icon: Users, color: 'green' },
          { title: 'Watch Time', value: totals.watch_minutes, icon: Clock, color: 'blue', suffix: 'min' },
          { title: 'Videos Uploaded', value: ch.video_count, icon: Upload, color: 'yellow' },
        ].map((card) => (
          <motion.div key={card.title} variants={cardFade}>
            <StatCard {...card} loading={loading} />
          </motion.div>
        ))}
      </motion.div>

      {/* ── Charts + Channel ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">

        {/* Views area chart */}
        <div className="glass p-5 xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-headline-sm font-semibold text-white">Daily Views</h2>
            <span className="badge badge-red"><span className="status-dot live mr-1" /> Live</span>
          </div>
          {loading ? (
            <div className="skeleton h-[180px] rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={dailyViews} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF0000" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#FF0000" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: 'rgba(229,226,225,0.3)', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(229,226,225,0.3)', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={fmt} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,0,0,0.2)' }} />
                <Area type="monotone" dataKey="views" stroke="#FF0000" strokeWidth={2} fill="url(#redGrad)" dot={false} activeDot={{ r: 4, fill: '#FF0000' }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Channel overview */}
        <div className="glass p-5">
          <h2 className="text-headline-sm font-semibold text-white mb-4">Channel</h2>
          {loading ? <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-6 rounded" />)}</div> : (
            <>
              <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-surface-high/30">
                {ch.thumbnail
                  ? <img src={ch.thumbnail} className="w-11 h-11 rounded-full border-2 border-yt-red" alt="" />
                  : <div className="w-11 h-11 rounded-full bg-surface-high flex items-center justify-center"><Users size={20} className="text-on-surface/30" /></div>
                }
                <div>
                  <div className="font-semibold text-white text-[14px]">{ch.title || 'Not Connected'}</div>
                  <div className="text-label text-on-surface/40 font-mono">{ch.id ? `@${ch.id}` : 'Connect YouTube'}</div>
                </div>
              </div>
              {[
                ['Subscribers', fmt(ch.total_subscribers)],
                ['Total Views', fmt(ch.total_views)],
                ['Videos',      fmt(ch.video_count)],
                ['Likes (period)', fmt(totals.likes)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between items-center py-2 border-b border-surface-high/50 last:border-0">
                  <span className="text-caption text-on-surface/50">{k}</span>
                  <span className="font-mono font-semibold text-white text-[13px]">{v || '—'}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* ── Bottom Row: Targets + Runs + Suggestions ────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Targets */}
        <div className="glass p-5">
          <div className="section-header">
            <h2 className="section-title flex items-center gap-2"><Target size={16} className="text-yt-red" /> Targets</h2>
          </div>
          <div className="space-y-4">
            {targets.map((t) => {
              const pct = Math.min(100, Math.round((t.current / t.target) * 100))
              return (
                <div key={t.label}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-caption text-on-surface/60">{t.label}</span>
                    <span className="text-caption font-mono text-on-surface/80">{fmt(t.current)} / {fmt(t.target)}</span>
                  </div>
                  <div className="progress-track">
                    <motion.div
                      className={`progress-fill ${t.color}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                    />
                  </div>
                  <div className="text-label font-mono text-on-surface/30 mt-1">{pct}% complete</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Runs */}
        <div className="glass p-5">
          <div className="section-header">
            <h2 className="section-title flex items-center gap-2"><Zap size={16} className="text-yt-red" /> Recent Runs</h2>
          </div>
          <div className="space-y-2">
            {runs.length === 0 && !loading && (
              <p className="text-caption text-on-surface/30 text-center py-4">No runs yet. Hit "Run Pipeline"!</p>
            )}
            <AnimatePresence>
              {runs.map((run, i) => {
                const Icon = STATUS_ICONS[run.status] || Clock
                return (
                  <motion.div key={run.id || i}
                    initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-surface-high/30 transition-colors"
                  >
                    <Icon size={14} className={
                      run.status === 'success' ? 'text-success mt-0.5 flex-shrink-0'
                      : run.status === 'failed' ? 'text-yt-red mt-0.5 flex-shrink-0'
                      : run.status === 'running' ? 'text-warning mt-0.5 flex-shrink-0 animate-spin'
                      : 'text-on-surface/30 mt-0.5 flex-shrink-0'
                    } />
                    <div className="flex-1 min-w-0">
                      <p className="text-caption text-on-surface/80 truncate">{run.title || run.topic || run.run_id}</p>
                      <p className="text-label font-mono text-on-surface/30">{fmtRelative(run.started_at)}</p>
                    </div>
                    <span className={`badge ${STATUS_COLORS[run.status] || 'badge-gray'} flex-shrink-0`}>
                      {run.status}
                    </span>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* AI Video Suggestions */}
        <div className="glass p-5">
          <div className="section-header">
            <h2 className="section-title flex items-center gap-2"><Rocket size={16} className="text-yt-red" /> AI Suggestions</h2>
            <motion.button whileTap={{ scale: 0.95 }} onClick={generateSuggestions} disabled={genLoading}
              className="btn btn-secondary btn-sm disabled:opacity-50"
            >
              {genLoading ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
              Generate
            </motion.button>
          </div>

          {suggestions.length === 0 && !genLoading && (
            <div className="text-center py-6">
              <Rocket size={28} className="text-on-surface/20 mx-auto mb-2" />
              <p className="text-caption text-on-surface/30">Click Generate to get AI topic ideas</p>
            </div>
          )}

          {genLoading && (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-16 rounded-lg" />)}
            </div>
          )}

          <div className="space-y-2">
            <AnimatePresence>
              {suggestions.map((s, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                  className="p-3 rounded-lg border border-surface-high hover:border-yt-red/30 transition-colors group"
                >
                  <p className="text-caption text-on-surface/80 mb-1 font-medium">{s.topic}</p>
                  <p className="text-label text-on-surface/40 italic mb-2">"{s.hook}"</p>
                  <motion.button whileTap={{ scale: 0.96 }}
                    onClick={() => useSuggestion(s.topic)}
                    className="text-label text-yt-red hover:underline flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Use this <ChevronRight size={11} />
                  </motion.button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
