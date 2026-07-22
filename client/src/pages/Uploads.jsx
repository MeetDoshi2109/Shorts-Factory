import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, ExternalLink, X, BarChart2, Eye, ThumbsUp, MessageCircle } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'
import PageTransition from '../components/PageTransition'
import VideoCard from '../components/VideoCard'
import { api, fmt, fmtDate } from '../lib/api'
import toast from 'react-hot-toast'

function VideoModal({ video, onClose }) {
  if (!video) return null
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          onClick={e => e.stopPropagation()}
          className="bg-surface-card border border-surface-high rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-modal"
        >
          <div className="p-5 border-b border-surface-high flex items-start justify-between">
            <div>
              <h2 className="text-headline-sm font-semibold text-white mb-1">{video.title}</h2>
              <p className="text-caption text-on-surface/40 font-mono">{fmtDate(video.published_at)}</p>
            </div>
            <button onClick={onClose} className="btn btn-ghost p-1.5"><X size={18} /></button>
          </div>

          <div className="p-5">
            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-3 mb-5">
              {[
                { label: 'Views', value: video.views, icon: Eye, color: 'text-yt-red' },
                { label: 'Likes', value: video.likes, icon: ThumbsUp, color: 'text-success' },
                { label: 'Comments', value: video.comments, icon: MessageCircle, color: 'text-info' },
                { label: 'Avg View %', value: `${video.avg_view_percentage || 0}%`, icon: BarChart2, color: 'text-warning', raw: true },
              ].map(({ label, value, icon: Icon, color, raw }) => (
                <div key={label} className="text-center p-3 rounded-lg bg-surface-high/30">
                  <Icon size={16} className={`${color} mx-auto mb-1`} />
                  <div className="font-mono font-bold text-white text-[18px]">{raw ? value : fmt(value)}</div>
                  <div className="text-label text-on-surface/40">{label}</div>
                </div>
              ))}
            </div>

            {/* Thumbnail */}
            <div className="flex gap-4 mb-5">
              <div className="w-24 rounded-lg overflow-hidden flex-shrink-0 border border-surface-high" style={{ aspectRatio: '9/16' }}>
                {video.thumbnail && <img src={video.thumbnail} className="w-full h-full object-cover" alt="" />}
              </div>
              <div className="flex-1">
                <h3 className="text-caption font-semibold text-on-surface/60 mb-2 uppercase tracking-wider font-mono">Description</h3>
                <p className="text-caption text-on-surface/60 leading-relaxed line-clamp-6">
                  {video.description || 'No description available.'}
                </p>
              </div>
            </div>

            <a
              href={video.url} target="_blank" rel="noreferrer"
              className="btn btn-primary w-full justify-center"
            >
              <ExternalLink size={15} /> Open in YouTube Studio
            </a>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default function Uploads() {
  const [videos, setVideos] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')
  const [selected, setSelected] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.analytics.videos(100)
      setVideos(data)
      setFiltered(data)
    } catch { toast.error('Could not load videos') }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    let v = [...videos]
    if (search) v = v.filter(x => x.title.toLowerCase().includes(search.toLowerCase()))
    if (sort === 'popular') v.sort((a, b) => b.views - a.views)
    else if (sort === 'likes') v.sort((a, b) => b.likes - a.likes)
    else v.sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
    setFiltered(v)
  }, [search, sort, videos])

  return (
    <PageTransition>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-headline font-bold text-white">Video Library</h1>
          <p className="text-caption text-on-surface/40 mt-1">{videos.length} Shorts uploaded</p>
        </div>
        <button onClick={load} className="btn btn-secondary btn-sm">Refresh</button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface/30" />
          <input className="input pl-9 w-56 text-caption" placeholder="Search videos…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-40 text-caption" value={sort} onChange={e => setSort(e.target.value)}>
          <option value="newest">Newest First</option>
          <option value="popular">Most Views</option>
          <option value="likes">Most Liked</option>
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="skeleton rounded-lg" style={{ aspectRatio: '9/16' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div className="w-20 h-20 rounded-full bg-surface-card border border-surface-high flex items-center justify-center mb-4">
            <Eye size={32} className="text-on-surface/20" />
          </div>
          <h3 className="text-headline-sm text-white mb-2">No videos yet</h3>
          <p className="text-caption text-on-surface/40">Run your first pipeline to create and upload a Short!</p>
        </motion.div>
      ) : (
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4"
          initial="hidden" animate="show"
          variants={{ show: { transition: { staggerChildren: 0.04 } } }}
        >
          {filtered.map((v) => (
            <motion.div key={v.id} variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}>
              <VideoCard video={v} onClick={() => setSelected(v)} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {selected && <VideoModal video={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </PageTransition>
  )
}
