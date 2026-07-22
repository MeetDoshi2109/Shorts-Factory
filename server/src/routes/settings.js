// server/src/routes/settings.js
import { Router } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

// GET /api/settings
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', req.user.id)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is 'not found'
    return res.status(500).json({ error: error.message });
  }

  const settings = data || {};

  // Add derived status fields (for the frontend to know if configured)
  settings.gemini_configured = !!settings.gemini_api_key;
  settings.youtube_configured = !!(settings.youtube_client_id && settings.youtube_client_secret);
  
  res.json(settings);
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

// POST /api/settings/auth-youtube — Not fully supported in multi-tenant without redirect flow
router.post('/auth-youtube', async (req, res) => {
  // In a real multi-tenant app, this would initiate a standard OAuth2 flow 
  // redirecting the user to Google and saving the refresh token in the DB.
  res.status(501).json({ error: 'OAuth flow must be performed manually or implemented via standard web OAuth in multi-tenant mode.' });
});

export default router;
