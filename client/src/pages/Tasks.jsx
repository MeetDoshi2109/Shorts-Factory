import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarClock, Clock, Play, Loader2, CheckCircle, XCircle, Terminal, Copy, ChevronRight } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import { api, fmtDate, fmtRelative } from '../lib/api'
import { usePipeline } from '../App'
import toast from 'react-hot-toast'

const SCHEDULES = [
  { time: '12:00', label: 'Midday', emoji: '☀️' },
  { time: '17:00', label: 'Evening', emoji: '🌇' },
  { time: '21:00', label: 'Night',  emoji: '🌙' },
]

function Countdown({ targetHHMM }) {
  const [remaining, setRemaining] = useState('')
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const [h, m] = targetHHMM.split(':').map(Number)
      const target = new Date(); target.setHours(h, m, 0, 0)
      if (target <= now) target.setDate(target.getDate() + 1)
      const diff = target - now
      const hh = Math.floor(diff / 3600000)
      const mm = Math.floor((diff % 3600000) / 60000)
      const ss = Math.floor((diff % 60000) / 1000)
      setRemaining(`${hh}h ${mm}m ${ss}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [targetHHMM])
  return <span className="font-mono text-yt-red">{remaining}</span>
}

const STATUS_MAP = {
  success: { icon: CheckCircle, cls: 'text-success',  badge: 'badge-green' },
  failed:  { icon: XCircle,     cls: 'text-yt-red',   badge: 'badge-red' },
  running: { icon: Loader2,     cls: 'text-warning animate-spin', badge: 'badge-yellow' },
  pending: { icon: Clock,       cls: 'text-on-surface/30', badge: 'badge-gray' },
}

export default function Tasks() {
  const { running, runPipeline } = usePipeline()
  const [runs, setRuns] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const logRef = useRef(null)
  const esRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setRuns(await api.pipeline.runs(30)) } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // SSE log streaming
  useEffect(() => {
    if (!running) { esRef.current?.close(); return }
    setLogs([])
    const es = new EventSource(api.pipeline.logsUrl())
    esRef.current = es
    es.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data)
        if (d.ping) return
        setLogs(prev => [...prev.slice(-200), d])
        setTimeout(() => logRef.current?.scrollTo(0, logRef.current.scrollHeight), 50)
      } catch {}
    }
    return () => es.close()
  }, [running])

  const cmdRoot = 'C:\\Users\\Asus\\OneDrive\\Desktop\\Shorts Factory'
  const schedulerCmd = `# Run in Administrator PowerShell\n$root = "${cmdRoot}"\nschtasks /create /tn "ShortsFactory_Noon" /tr "$root\\run_daily.bat" /sc daily /st 12:00 /f\nschtasks /create /tn "ShortsFactory_5pm"  /tr "$root\\run_daily.bat" /sc daily /st 17:00 /f\nschtasks /create /tn "ShortsFactory_9pm"  /tr "$root\\run_daily.bat" /sc daily /st 21:00 /f`

  return (
    <PageTransition>
      <div className="mb-7">
        <h1 className="text-headline font-bold text-white">Tasks</h1>
        <p className="text-caption text-on-surface/40 mt-1">Scheduled automation & pipeline runs</p>
      </div>

      {/* ── Schedule Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {SCHEDULES.map((s, i) => (
          <motion.div key={s.time} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xl">{s.emoji}</span>
              <span className="badge badge-green text-label">Active</span>
            </div>
            <div className="font-mono font-bold text-2xl text-white mb-0.5">{s.time}</div>
            <div className="text-caption text-on-surface/50 mb-3">{s.label} run</div>
            <div className="text-caption text-on-surface/40">
              Next: <Countdown targetHHMM={s.time} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* ── Run History ─────────────────────────────────────────────── */}
        <div className="glass p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-headline-sm font-semibold text-white">Run History</h2>
            <button onClick={load} className="btn btn-ghost btn-sm text-caption">Refresh</button>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-hide">
            {loading && [...Array(5)].map((_, i) => <div key={i} className="skeleton h-14 rounded-lg" />)}
            <AnimatePresence>
              {runs.map((r, i) => {
                const sm = STATUS_MAP[r.status] || STATUS_MAP.pending
                const Icon = sm.icon
                return (
                  <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="flex items-start gap-3 p-3 rounded-lg border border-surface-high/50 hover:border-surface-bright transition-colors"
                  >
                    <Icon size={15} className={`${sm.cls} flex-shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-caption text-on-surface/80 truncate font-medium">{r.title || r.topic || r.run_id}</p>
                      <p className="text-label font-mono text-on-surface/30">{fmtRelative(r.started_at)} · {r.elapsed_seconds ? `${r.elapsed_seconds}s` : ''}</p>
                      {r.url && <a href={r.url} target="_blank" rel="noreferrer" className="text-label text-yt-red hover:underline font-mono">View on YouTube →</a>}
                    </div>
                    <span className={`badge ${sm.badge} flex-shrink-0`}>{r.status}</span>
                  </motion.div>
                )
              })}
            </AnimatePresence>
            {!loading && runs.length === 0 && (
              <p className="text-caption text-on-surface/30 text-center py-8">No runs yet. Hit "Run Now" in the sidebar!</p>
            )}
          </div>
        </div>

        {/* ── Live Log + Scheduler Setup ──────────────────────────────── */}
        <div className="space-y-4">

          {/* Live Log */}
          <div className="glass p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-headline-sm font-semibold text-white flex items-center gap-2">
                <Terminal size={16} className="text-yt-red" /> Live Logs
                {running && <span className="badge badge-red"><span className="status-dot live mr-1" />Live</span>}
              </h2>
            </div>
            <div ref={logRef}
              className="bg-[#060606] border border-surface-high rounded-lg p-3 h-48 overflow-y-auto scrollbar-hide font-mono text-[11px] leading-relaxed"
            >
              {logs.length === 0 && !running && (
                <p className="text-on-surface/20">Logs appear here when pipeline is running…</p>
              )}
              <AnimatePresence>
                {logs.map((line, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                    className={
                      typeof line === 'string' && line.includes('[ERR]') ? 'text-yt-red'
                      : typeof line === 'string' && line.includes('WARNING') ? 'text-warning'
                      : 'text-success/80'
                    }
                  >
                    {typeof line === 'string' ? line : JSON.stringify(line)}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Task Scheduler */}
          <div className="glass p-5">
            <h2 className="text-headline-sm font-semibold text-white mb-3">Windows Task Scheduler</h2>
            <p className="text-caption text-on-surface/50 mb-3">Run this once in Administrator PowerShell to automate 3×/day uploads:</p>
            <pre className="code-block text-[10px] leading-relaxed mb-3 overflow-x-auto whitespace-pre">{schedulerCmd}</pre>
            <button onClick={() => { navigator.clipboard.writeText(schedulerCmd); toast.success('Copied!') }}
              className="btn btn-secondary btn-sm"
            >
              <Copy size={13} /> Copy Command
            </button>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
