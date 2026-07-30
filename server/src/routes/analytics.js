// server/src/routes/analytics.js
import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '../../..');
const VENV_PYTHON = 'C:\\sf_venv\\Scripts\\python.exe';
const BACKEND_ANALYTICS = join(PROJECT_ROOT, 'backend/fetch_analytics.py');

const router = Router();

// Helper to execute fetch_analytics.py and capture JSON output
function runAnalyticsScript(args) {
  return new Promise((resolve, reject) => {
    const pythonBin = existsSync(VENV_PYTHON) ? VENV_PYTHON : 'python';
    
    const child = spawn(pythonBin, args, {
      cwd: PROJECT_ROOT,
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(stderr || `Python exit code ${code}`));
      }
      try {
        const parsed = JSON.parse(stdout);
        resolve(parsed);
      } catch (err) {
        reject(new Error('Failed to parse Python JSON output: ' + err.message + '\nRaw: ' + stdout));
      }
    });
  });
}

// GET /api/analytics?days=28&force=false
router.get('/', async (req, res) => {
  const days = parseInt(req.query.days) || 28;
  const force = req.query.force === 'true';
  const userId = req.user.id;

  // 1. Try to read from Supabase
  const { data: dbData, error } = await supabase
    .from('analytics_snapshots')
    .select('*')
    .eq('user_id', userId)
    .eq('period_days', days)
    .order('fetched_at', { ascending: false })
    .limit(1);

  if (error) return res.status(500).json({ error: error.message });

  const snapshot = dbData && dbData[0];
  const isExpired = snapshot ? (Date.now() - new Date(snapshot.fetched_at).getTime() > 4 * 60 * 60 * 1000) : true;

  // 2. Fetch from YouTube if expired, missing, or forced
  if (!snapshot || isExpired || force) {
    try {
      console.log(`[analytics] Fetching fresh analytics from YouTube for user ${userId}...`);
      const data = await runAnalyticsScript([BACKEND_ANALYTICS, '--days', days.toString()]);
      
      // Map to Supabase columns
      const insertData = {
        user_id: userId,
        period_days: days,
        total_views: data.totals?.views || 0,
        total_subs: data.channel?.total_subscribers || 0,
        watch_minutes: data.totals?.watch_minutes || 0,
        subs_gained: data.totals?.subs_gained || 0,
        likes: data.totals?.likes || 0,
        daily_views: data.daily_views || [],
        top_videos: data.top_videos || [],
        channel_info: data.channel || {},
        fetched_at: new Date().toISOString(),
      };

      // Upsert into Supabase
      const { data: upserted, error: upsertErr } = await supabase
        .from('analytics_snapshots')
        .upsert(insertData, { onConflict: 'user_id,period_days' })
        .select('*');

      if (upsertErr) {
        console.error('[analytics] Supabase upsert error:', upsertErr.message);
      }

      return res.json(upserted ? upserted[0] : insertData);
    } catch (err) {
      console.error('[analytics] Fetch script failed:', err.message);
      // Return stale data if available, otherwise fallback empty object
      if (snapshot) return res.json(snapshot);
      return res.json({
        period_days: days,
        total_views: 0,
        total_subs: 0,
        watch_minutes: 0,
        daily_views: [],
        top_videos: [],
        channel_info: { title: 'No YouTube channel connected' }
      });
    }
  }

  res.json(snapshot);
});

// GET /api/analytics/videos?limit=50
router.get('/videos', async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const userId = req.user.id;

  // Try to read from database
  const { data: dbData, error } = await supabase
    .from('videos')
    .select('*')
    .eq('user_id', userId)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) return res.status(500).json({ error: error.message });

  // If empty, fetch from YouTube and seed database
  if (!dbData || dbData.length === 0) {
    try {
      console.log(`[analytics] Seeding videos database from YouTube...`);
      const rawVideos = await runAnalyticsScript([BACKEND_ANALYTICS, '--videos']);
      
      if (rawVideos && rawVideos.length > 0) {
        const videosToInsert = rawVideos.map(v => ({
          user_id: userId,
          video_id: v.id,
          title: v.title,
          description: v.description || '',
          url: v.url,
          thumbnail: v.thumbnail || '',
          views: v.views || 0,
          likes: v.likes || 0,
          comments: v.comments || 0,
          published_at: v.published_at ? new Date(v.published_at).toISOString() : new Date().toISOString(),
        }));

        await supabase.from('videos').upsert(videosToInsert, { onConflict: 'user_id,video_id' });
        
        // Return latest
        return res.json(videosToInsert.slice(0, limit));
      }
    } catch (err) {
      console.error('[analytics] Videos seed failed:', err.message);
    }
  }

  res.json(dbData || []);
});

export default router;
