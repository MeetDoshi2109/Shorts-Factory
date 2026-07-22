import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart3, Eye, Users, Clock, TrendingUp, Download, RefreshCw,
  ThumbsUp, MessageCircle, ExternalLink
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import PageTransition from '../components/PageTransition'
import StatCard from '../components/StatCard'
import { api, fmt, fmtDate } from '../lib/api'
import toast from 'react-hot-toast'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass px-3 py-2 text-caption">
      <p className="text-on-surface/50 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} className="font-mono font-semibold" style={{ color: p.color }}>
          {fmt(p.value)} {p.name}
        </p>
      ))}
    </div>
  )
}

export default function Analytics() {
  const [days, setDays] = useState(28)
  const [data, setData] = useState(null)
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (force = false) => {
    setLoading(true)
    try {
      const [a, v] = await Promise.allSettled([
        api.analytics.get(days, force),
        api.analytics.videos(10),
      ])
      if (a.status === 'fulfilled') setData(a.value)
      if (v.status === 'fulfilled') setVideos(v.value)
    } catch {}
    setLoading(false)
  }, [days])

  useEffect(() => { load() }, [load])

  const downloadCSV = () => {
    if (!videos.length) return
    const header = 'Title,Views,Likes,Comments,Published'
    const rows = videos.map(v => `"${v.title}",${v.views},${v.likes},${v.comments},${fmtDate(v.published_at)}`)
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = 'shorts_analytics.csv'; a.click()
    toast.success('CSV downloaded!')
  }

  const ch = data?.channel_info || {}
  const totals = data?.totals || {}
  const dailyViews = (data?.daily_views || []).map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    views: d.views,
  }))
  const topVideos = (data?.top_videos || videos).slice(0, 10)

  return (
    <PageTransition>
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-headline font-bold text-white">Analytics</h1>
          <p className="text-caption text-on-surface/40 mt-1">Channel performance deep-dive</p>
        </div>
        <div className="flex gap-2 items-center">
          <select className="input text-caption w-36" value={days} onChange={e => setDays(Number(e.target.value))}>
            <option value={7}>Last 7 days</option>
            <option value={28}>Last 28 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button onClick={() => load(true)} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={downloadCSV} className="btn btn-secondary btn-sm">
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {[
          { title: 'Total Views', value: totals.views, icon: Eye, color: 'red' },
          { title: 'Subscribers Gained', value: totals.subs_gained, icon: Users, color: 'green' },
          { title: 'Watch Time (min)', value: totals.watch_minutes, icon: Clock, color: 'blue' },
          { title: 'Total Likes', value: totals.likes, icon: ThumbsUp, color: 'yellow' },
        ].map(c => <StatCard key={c.title} {...c} loading={loading} />)}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
        <div className="glass p-5">
          <h2 className="text-headline-sm font-semibold text-white mb-4">Views Over Time</h2>
          {loading ? <div className="skeleton h-[200px] rounded-lg" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={dailyViews} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF0000" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#FF0000" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: 'rgba(229,226,225,0.3)', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(229,226,225,0.3)', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={fmt} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="views" stroke="#FF0000" strokeWidth={2} fill="url(#grad2)" dot={false} activeDot={{ r: 4, fill: '#FF0000' }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass p-5">
          <h2 className="text-headline-sm font-semibold text-white mb-4">Top Video Performance</h2>
          {loading ? <div className="skeleton h-[200px] rounded-lg" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topVideos.slice(0, 6).map(v => ({ name: v.title?.slice(0, 14) + '…', views: v.views, likes: v.likes }))} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: 'rgba(229,226,225,0.25)', fontSize: 9, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(229,226,225,0.3)', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={fmt} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="views" fill="#FF0000" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="likes" fill="#4edea3" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top Videos Table */}
      <div className="glass p-5">
        <h2 className="text-headline-sm font-semibold text-white mb-4">Top Videos Detailed</h2>
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>#</th>
                <th>Title</th>
                <th>Views</th>
                <th>Likes</th>
                <th>Comments</th>
                <th>Avg View %</th>
                <th>Published</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan={8}><div className="skeleton h-6 rounded" /></td></tr>
                ))
                : topVideos.map((v, i) => (
                  <motion.tr key={v.id || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                    <td className="mono text-on-surface/30">{i + 1}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        {v.thumbnail && <img src={v.thumbnail} className="w-6 h-10 rounded object-cover flex-shrink-0" alt="" />}
                        <span className="text-caption text-on-surface/80 line-clamp-2 max-w-xs">{v.title}</span>
                      </div>
                    </td>
                    <td className="mono">{fmt(v.views)}</td>
                    <td className="mono text-success">{fmt(v.likes)}</td>
                    <td className="mono text-info">{fmt(v.comments)}</td>
                    <td className="mono text-warning">{(v.avg_view_percentage || 0).toFixed(1)}%</td>
                    <td className="text-caption text-on-surface/40">{fmtDate(v.published_at)}</td>
                    <td>
                      <a href={v.url} target="_blank" rel="noreferrer" className="btn btn-ghost p-1.5">
                        <ExternalLink size={13} />
                      </a>
                    </td>
                  </motion.tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </PageTransition>
  )
}
