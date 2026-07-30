// server/src/routes/settings.js
import { Router } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

// Env fallbacks — used when a user has no saved settings yet (first login)
const ENV_DEFAULTS = {
  gemini_api_key:         process.env.GEMINI_API_KEY         || null,
  youtube_client_id:      process.env.YOUTUBE_CLIENT_ID      || null,
  youtube_client_secret:  process.env.YOUTUBE_CLIENT_SECRET  || null,
  channel_niche:          process.env.CHANNEL_NICHE          || 'personal finance',
  channel_target_audience: process.env.CHANNEL_TARGET_AUDIENCE || 'young adults 18-35',
  upload_privacy:         process.env.UPLOAD_PRIVACY         || 'public',
  daily_upload_count:     process.env.DAILY_UPLOAD_COUNT     || '3',
  video_duration_max:     process.env.VIDEO_DURATION_MAX     || '58',
  target_subs:            '1000',
  target_views:           '100000',
  target_uploads:         '30',
};

// GET /api/settings
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', req.user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    return res.status(500).json({ error: error.message });
  }

  // If no row exists yet, seed from .env and save it
  if (!data) {
    const seed = { ...ENV_DEFAULTS, user_id: req.user.id };
    await supabase.from('user_settings').upsert(seed, { onConflict: 'user_id' });
    const settings = { ...seed };
    settings.gemini_configured   = !!settings.gemini_api_key;
    settings.youtube_configured  = !!(settings.youtube_client_id && settings.youtube_client_secret);
    return res.json(settings);
  }

  // Row exists — merge with env fallbacks for any null fields
  const merged = { ...ENV_DEFAULTS, ...data };

  merged.gemini_configured  = !!(merged.gemini_api_key);
  merged.youtube_configured = !!(merged.youtube_client_id && merged.youtube_client_secret);

  res.json(merged);
});

// PUT /api/settings
router.put('/', async (req, res) => {
  const updates = { ...req.body, user_id: req.user.id };

  const { error } = await supabase
    .from('user_settings')
    .upsert(updates, { onConflict: 'user_id' });

  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true });
});

// POST /api/settings/auth-youtube
// Returns the client_id so the frontend can initiate the Google OAuth flow
router.post('/auth-youtube', async (req, res) => {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  if (!clientId) {
    return res.status(400).json({ error: 'YOUTUBE_CLIENT_ID not configured in .env' });
  }
  // The actual OAuth token exchange is done by running authenticate_youtube.bat
  res.json({
    message: 'Run authenticate_youtube.bat to complete YouTube OAuth.',
    client_id: clientId,
  });
});

export default router;
