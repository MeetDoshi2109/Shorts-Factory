// server/src/routes/analytics.js
import { Router } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

// GET /api/analytics?days=28
router.get('/', async (req, res) => {
  const days = parseInt(req.query.days) || 28;
  const { data, error } = await supabase
    .from('analytics_snapshots')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('period_days', days)
    .order('fetched_at', { ascending: false })
    .limit(1);

  if (error) return res.status(500).json({ error: error.message });
  if (!data || data.length === 0) return res.json(null);
  res.json(data[0]);
});

// GET /api/analytics/videos?limit=50
router.get('/videos', async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('user_id', req.user.id)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
