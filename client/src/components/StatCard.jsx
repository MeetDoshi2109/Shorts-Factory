import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useEffect } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { fmt } from '../lib/api'

function AnimatedNumber({ value, format = fmt }) {
  const mv = useMotionValue(0)
  const spring = useSpring(mv, { stiffness: 60, damping: 18 })
  const display = useTransform(spring, (v) => format(Math.round(v)))

  useEffect(() => { mv.set(Number(value) || 0) }, [value, mv])

  return <motion.span>{display}</motion.span>
}

const COLOR_MAP = {
  red:    { ring: 'rgba(255,0,0,0.25)',   icon: 'rgba(255,0,0,0.1)',   text: 'text-yt-red' },
  green:  { ring: 'rgba(78,222,163,0.2)', icon: 'rgba(78,222,163,0.1)', text: 'text-success' },
  blue:   { ring: 'rgba(74,144,226,0.2)', icon: 'rgba(74,144,226,0.1)', text: 'text-info' },
  yellow: { ring: 'rgba(255,185,95,0.2)', icon: 'rgba(255,185,95,0.1)', text: 'text-warning' },
}

export default function StatCard({ title, value, delta, deltaLabel, icon: Icon, color = 'red', loading, suffix = '', format }) {
  const c = COLOR_MAP[color] || COLOR_MAP.red
  const positive = Number(delta) >= 0

  return (
    <motion.div
      whileHover={{ y: -3, boxShadow: `0 12px 40px ${c.ring}` }}
      transition={{ duration: 0.2 }}
      className="stat-card"
      style={{ boxShadow: `0 2px 12px rgba(0,0,0,0.3)` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-caption text-on-surface/50 font-medium">{title}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: c.icon }}>
          {Icon && <Icon size={16} className={c.text} />}
        </div>
      </div>

      {/* Value */}
      {loading ? (
        <div className="skeleton h-9 w-24 mb-3 rounded" />
      ) : (
        <div className={`text-[32px] font-bold leading-none mb-3 counter text-white`}>
          <AnimatedNumber value={value} format={format || fmt} />
          {suffix && <span className="text-xl text-on-surface/50 ml-1">{suffix}</span>}
        </div>
      )}

      {/* Delta */}
      {delta !== undefined && (
        <div className="flex items-center gap-1.5">
          {positive
            ? <TrendingUp size={13} className="text-success" />
            : <TrendingDown size={13} className="text-yt-red" />
          }
          <span className={`text-caption font-mono font-medium ${positive ? 'text-success' : 'text-yt-red'}`}>
            {positive ? '+' : ''}{fmt(delta)}
          </span>
          {deltaLabel && <span className="text-caption text-on-surface/40">{deltaLabel}</span>}
        </div>
      )}
    </motion.div>
  )
}
