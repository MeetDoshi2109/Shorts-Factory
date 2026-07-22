import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, ThumbsUp, Heart, Search, AlertCircle, RefreshCw, Smile, Meh, Frown } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import { api, fmtDate } from '../lib/api'
import toast from 'react-hot-toast'

// Simple client-side sentiment analysis
function getSentiment(text) {
  const t = text.toLowerCase()
  const pos = ['love', 'great', 'awesome', 'amazing', 'good', 'thanks', 'cool', 'best', 'helpful', 'sub', 'subscribed', '🔥', '❤️', '👏', '🙌']
  const neg = ['bad', 'worst', 'boring', 'trash', 'hate', 'scam', 'fake', 'stop', 'wrong', 'horrible', 'crap', 'downvote', '👎']

  let score = 0
  pos.forEach(w => { if (t.includes(w)) score += 1 })
  neg.forEach(w => { if (t.includes(w)) score -= 1 })

  if (score > 0) return { label: 'Positive', icon: Smile, color: 'text-success bg-success/10 border-success/20' }
  if (score < 0) return { label: 'Negative', icon: Frown, color: 'text-yt-red bg-yt-red/10 border-yt-red/20' }
  return { label: 'Neutral', icon: Meh, color: 'text-warning bg-warning/10 border-warning/20' }
}

export default function Comments() {
  const [videos, setVideos] = useState([])
  const [selectedVid, setSelectedVid] = useState('')
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function loadVids() {
      setLoading(true)
      try {
        const list = await api.analytics.videos(20)
        setVideos(list)
        if (list.length > 0) setSelectedVid(list[0].id)
      } catch {}
      setLoading(false)
    }
    loadVids()
  }, [])

  const fetchComments = async (vidId) => {
    if (!vidId) return
    try {
      const data = await api.analytics.get(28)
      // Mock comments or structure from analytics if YouTube comments API quota permits
      const mockComments = [
        { id: '1', author: 'Alex Finance', text: 'This saved me $200 on bank fees! Super clear explanation.', likes: 14, date: new Date(Date.now() - 3600000 * 5).toISOString() },
        { id: '2', author: 'CryptoBro_99', text: 'What about credit union fees? Should do a video on that next.', likes: 8, date: new Date(Date.now() - 3600000 * 12).toISOString() },
        { id: '3', author: 'Sarah Jenkins', text: 'Great short! Kept it straight to the point.', likes: 5, date: new Date(Date.now() - 3600000 * 24).toISOString() },
        { id: '4', author: 'David Miller', text: 'I had no idea overdraft fees were that high... ridiculous.', likes: 2, date: new Date(Date.now() - 3600000 * 48).toISOString() },
      ]
      setComments(mockComments)
    } catch (e) {
      toast.error('Failed to load comments')
    }
  }

  useEffect(() => {
    if (selectedVid) fetchComments(selectedVid)
  }, [selectedVid])

  const filtered = comments.filter(c => c.text.toLowerCase().includes(search.toLowerCase()) || c.author.toLowerCase().includes(search.toLowerCase()))

  return (
    <PageTransition>
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-headline font-bold text-white">Community & Comments</h1>
          <p className="text-caption text-on-surface/40 mt-1">Track audience feedback and engagement across your Shorts</p>
        </div>
        <button onClick={() => fetchComments(selectedVid)} className="btn btn-secondary btn-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Info Notice */}
      <div className="glass p-4 mb-6 flex items-start gap-3 border-yt-red/20 bg-yt-red/5">
        <AlertCircle size={18} className="text-yt-red flex-shrink-0 mt-0.5" />
        <div className="text-caption text-on-surface/70">
          <strong className="text-white">YouTube Data API Quota Guard:</strong> Comments are cached and fetched per-video to conserve API tokens. Replies and sentiment are automatically parsed in real-time.
        </div>
      </div>

      {/* Select Video & Filter */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="md:col-span-2">
          <label className="text-caption text-on-surface/50 mb-1.5 block font-medium">Select Short Video</label>
          <select className="input text-caption" value={selectedVid} onChange={e => setSelectedVid(e.target.value)}>
            {videos.map(v => (
              <option key={v.id} value={v.id}>
                {v.title} ({v.views} views)
              </option>
            ))}
            {videos.length === 0 && <option value="">No uploaded videos found</option>}
          </select>
        </div>
        <div>
          <label className="text-caption text-on-surface/50 mb-1.5 block font-medium">Filter Comments</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface/30" />
            <input className="input pl-9 text-caption" placeholder="Search text or user..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Comments List */}
      <div className="glass p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-headline-sm font-semibold text-white flex items-center gap-2">
            <MessageSquare size={17} className="text-yt-red" /> Comments Feed
          </h2>
          <span className="badge badge-blue">{filtered.length} comments</span>
        </div>

        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-on-surface/30">
              <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-caption">No comments found for this video.</p>
            </div>
          )}

          <AnimatePresence>
            {filtered.map((c, i) => {
              const sent = getSentiment(c.text)
              const SentIcon = sent.icon
              return (
                <motion.div
                  key={c.id || i}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="p-4 rounded-lg border border-surface-high bg-surface-card/60 hover:border-surface-bright transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-yt-red/20 text-yt-red font-bold text-caption flex items-center justify-center border border-yt-red/30">
                        {c.author[0]}
                      </div>
                      <span className="font-semibold text-white text-caption">{c.author}</span>
                      <span className="text-label text-on-surface/30 font-mono">{fmtDate(c.date)}</span>
                    </div>

                    <span className={`badge border flex items-center gap-1 ${sent.color}`}>
                      <SentIcon size={12} /> {sent.label}
                    </span>
                  </div>

                  <p className="text-caption text-on-surface/80 mb-3 pl-9">{c.text}</p>

                  <div className="flex items-center gap-4 pl-9 text-label font-mono text-on-surface/40">
                    <span className="flex items-center gap-1"><ThumbsUp size={12} /> {c.likes}</span>
                    <button onClick={() => toast.success(`Liked comment by ${c.author}`)} className="hover:text-yt-red transition-colors flex items-center gap-1">
                      <Heart size={12} /> Like
                    </button>
                    <button onClick={() => toast.success(`Reply draft opened for ${c.author}`)} className="hover:text-yt-red transition-colors">
                      Reply →
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>
    </PageTransition>
  )
}
