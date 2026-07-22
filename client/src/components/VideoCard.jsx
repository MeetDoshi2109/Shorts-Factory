import { motion } from 'framer-motion'
import { Play, ExternalLink, ThumbsUp, Eye, MessageCircle } from 'lucide-react'
import { fmt, fmtDate } from '../lib/api'

export default function VideoCard({ video, onClick }) {
  if (!video) return null
  const { title, thumbnail, views, likes, comments, published_at, url } = video

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className="cursor-pointer group relative rounded-lg overflow-hidden border border-surface-high bg-surface-card"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}
    >
      {/* Thumbnail — 9:16 */}
      <div className="relative w-full bg-surface-high" style={{ aspectRatio: '9/16' }}>
        {thumbnail
          ? <img src={thumbnail} alt={title} className="w-full h-full object-cover" loading="lazy" />
          : (
            <div className="w-full h-full flex items-center justify-center">
              <Play size={36} className="text-on-surface/20" />
            </div>
          )
        }

        {/* Hover overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          className="absolute inset-0 bg-black/60 flex items-center justify-center gap-3 flex-col"
        >
          <motion.button
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
            onClick={(e) => { e.stopPropagation(); window.open(url, '_blank') }}
            className="btn btn-primary btn-sm"
          >
            <ExternalLink size={13} /> View on YouTube
          </motion.button>
        </motion.div>

        {/* View count overlay badge */}
        <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-0.5 rounded text-label font-mono text-white">
          {fmt(views)}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-caption font-medium text-on-surface/80 line-clamp-2 mb-2 leading-relaxed">{title}</p>
        <p className="text-label font-mono text-on-surface/30 mb-2">{fmtDate(published_at)}</p>
        <div className="flex items-center gap-3 text-label font-mono text-on-surface/40">
          <span className="flex items-center gap-1"><Eye size={11} />{fmt(views)}</span>
          <span className="flex items-center gap-1"><ThumbsUp size={11} />{fmt(likes)}</span>
          <span className="flex items-center gap-1"><MessageCircle size={11} />{fmt(comments)}</span>
        </div>
      </div>

      {/* Active border on hover */}
      <motion.div
        initial={{ scaleX: 0 }}
        whileHover={{ scaleX: 1 }}
        transition={{ duration: 0.2 }}
        className="absolute bottom-0 left-0 right-0 h-0.5 bg-yt-red origin-left"
      />
    </motion.div>
  )
}
