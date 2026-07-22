import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, BarChart3, Video, Sparkles,
  CalendarClock, MessageSquare, UserCircle, Settings,
  Play, Rocket, Wifi, WifiOff, ChevronRight,
} from 'lucide-react'
import { usePipeline } from '../App'
import toast from 'react-hot-toast'

const NAV = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/analytics', icon: BarChart3,        label: 'Analytics' },
  { to: '/uploads',   icon: Video,            label: 'Uploads' },
  { to: '/studio',    icon: Sparkles,         label: 'Studio' },
  { to: '/tasks',     icon: CalendarClock,    label: 'Tasks' },
  { to: '/comments',  icon: MessageSquare,    label: 'Comments' },
  { to: '/account',   icon: UserCircle,       label: 'Account' },
  { to: '/settings',  icon: Settings,         label: 'Settings' },
]

export default function Sidebar() {
  const { running, lastRun, runPipeline, serverOnline } = usePipeline()
  const navigate = useNavigate()

  const handleRunNow = async () => {
    if (running) { toast.error('Pipeline already running'); return }
    try {
      await runPipeline({})
      toast.success('Pipeline started!')
    } catch (e) {
      toast.error(e.message || 'Start server first')
    }
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[260px] flex flex-col bg-[#0a0a0a] border-r border-surface-high z-50">

      {/* ── Logo ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-surface-high">
        <div className="w-9 h-9 rounded-lg bg-yt-red flex items-center justify-center shadow-red flex-shrink-0">
          <Play size={18} className="text-white fill-white" />
        </div>
        <div>
          <div className="font-bold text-[15px] text-white text-glow leading-none">Shorts Factory</div>
          <div className="text-label text-on-surface/40 font-mono mt-0.5">AI Automation</div>
        </div>
      </div>

      {/* ── Pipeline Status Card ─────────────────────────────────────── */}
      <div className="mx-3 my-3 p-3 rounded-lg bg-surface-card border border-surface-high">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-label text-on-surface/40 font-mono uppercase tracking-wider">Pipeline</span>
          <AnimatePresence mode="wait">
            {running ? (
              <motion.span key="running"
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="badge badge-red flex items-center gap-1.5"
              >
                <span className="status-dot live" /> Running
              </motion.span>
            ) : (
              <motion.span key="idle"
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="badge badge-green"
              >
                <span className="status-dot online" /> Idle
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <motion.button
          whileTap={{ scale: 0.96 }}
          whileHover={{ scale: 1.02 }}
          onClick={handleRunNow}
          disabled={running}
          className="btn btn-primary w-full justify-center btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Rocket size={14} />
          {running ? 'Running…' : 'Run Now'}
        </motion.button>

        {lastRun && (
          <div className="mt-2 text-label text-on-surface/30 font-mono truncate">
            Last: {lastRun.title?.slice(0, 28) || lastRun.run_id}
          </div>
        )}
      </div>

      {/* ── Navigation ──────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-1 scrollbar-hide">
        <div className="px-5 py-1.5 text-label text-on-surface/30 font-mono uppercase tracking-wider">Main</div>

        {NAV.slice(0, 5).map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}>
            {({ isActive }) => (
              <motion.div
                whileHover={{ x: 3 }}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={17} />
                <span>{label}</span>
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-yt-red"
                  />
                )}
              </motion.div>
            )}
          </NavLink>
        ))}

        <div className="px-5 py-1.5 mt-2 text-label text-on-surface/30 font-mono uppercase tracking-wider">Manage</div>

        {NAV.slice(5).map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}>
            {({ isActive }) => (
              <motion.div
                whileHover={{ x: 3 }}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={17} />
                <span>{label}</span>
                {isActive && (
                  <motion.div layoutId="nav-indicator" className="ml-auto w-1.5 h-1.5 rounded-full bg-yt-red" />
                )}
              </motion.div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Footer — Server Status ───────────────────────────────────── */}
      <div className="border-t border-surface-high px-4 py-3">
        <div className="flex items-center gap-2">
          <AnimatePresence mode="wait">
            {serverOnline === null ? (
              <span key="checking" className="status-dot offline" />
            ) : serverOnline ? (
              <motion.span key="online" initial={{ scale: 0 }} animate={{ scale: 1 }} className="status-dot online" />
            ) : (
              <motion.span key="offline" initial={{ scale: 0 }} animate={{ scale: 1 }} className="status-dot offline" />
            )}
          </AnimatePresence>
          <span className="text-label font-mono text-on-surface/40">
            {serverOnline === null ? 'Checking…' : serverOnline ? 'Server Online' : 'Server Offline'}
          </span>
        </div>
        <div className="text-label font-mono text-on-surface/25 mt-0.5">localhost:8899</div>
      </div>
    </aside>
  )
}
