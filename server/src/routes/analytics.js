// server/src/routes/analytics.js
import { Router } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();
const CACHE_TTL_HOURS = 4;

// GET /api/analytics?days=28&force=false
router.get('/', async (req, res) => {
  const days = parseInt(req.query.days || '28');
  const force = req.query.force === 'true';

  // Try cache first
  if (!force) {
    const { data: cached } = await supabase
      .from('analytics_snapshots')
      .select('*')
      .eq('period_days', days)
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single();

    if (cached) {
      const ageHours = (Date.now() - new Date(cached.fetched_at).getTime()) / 3600000;
      if (ageHours < CACHE_TTL_HOURS) {
        return res.json({ ...cached, from_cache: true });
      }
    }
  }

  // Return empty structure (Python fetch_analytics.py writes to DB)
  // The dashboard triggers a refresh by calling the Python analytics script
  const { data: latest } = await supabase
    .from('analytics_snapshots')
    .select('*')
    .eq('period_days', days)
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single();

  if (latest) return res.json({ ...latest, from_cache: false });

  res.json({
    period_days: days,
    total_views: 0,
    total_subs: 0,
    watch_minutes: 0,
    subs_gained: 0,
    likes: 0,
    daily_views: [],
    top_videos: [],
    channel_info: {},
    note: 'No analytics yet. Run pipeline and connect YouTube.',
  });
});

// GET /api/analytics/videos — from Supabase videos table
router.get('/videos', async (req, res) => {
  const limit = parseInt(req.query.limit || '50');
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(limit);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

export default router;
