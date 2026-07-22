// server/src/routes/settings.js
import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_FILE = join(__dirname, '../../../.env');

const router = Router();

// GET /api/settings
router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('settings').select('*');
  if (error) return res.status(500).json({ error: error.message });

  // Convert array to object
  const settings = Object.fromEntries((data || []).map(s => [s.key, s.value]));

  // Add derived status fields
  settings.gemini_configured = !!process.env.GEMINI_API_KEY;
  settings.youtube_configured = !!(process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET);
  settings.youtube_authed = fs.existsSync(join(__dirname, '../../../data/youtube_token.json'));

  res.json(settings);
});

// PUT /api/settings
router.put('/', async (req, res) => {
  const updates = req.body; // { key: value, ... }
  const rows = Object.entries(updates).map(([key, value]) => ({ key, value: String(value) }));

  const { error } = await supabase
    .from('settings')
    .upsert(rows, { onConflict: 'key' });

  if (error) return res.status(500).json({ error: error.message });

  // Also update .env file for fields that Python reads
  const envFields = {
    CHANNEL_NICHE: updates.CHANNEL_NICHE,
    CHANNEL_TARGET_AUDIENCE: updates.CHANNEL_TARGET_AUDIENCE,
    UPLOAD_PRIVACY: updates.UPLOAD_PRIVACY,
    DAILY_UPLOAD_COUNT: updates.DAILY_UPLOAD_COUNT,
    GEMINI_API_KEY: updates.GEMINI_API_KEY,
    YOUTUBE_CLIENT_ID: updates.YOUTUBE_CLIENT_ID,
    YOUTUBE_CLIENT_SECRET: updates.YOUTUBE_CLIENT_SECRET,
  };

  try {
    let envContent = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf8') : '';
    for (const [key, val] of Object.entries(envFields)) {
      if (val === undefined) continue;
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${val}`);
      } else {
        envContent += `\n${key}=${val}`;
      }
    }
    fs.writeFileSync(ENV_FILE, envContent);
  } catch {}

  res.json({ success: true });
});

// POST /api/settings/auth-youtube — triggers YouTube OAuth via Python
router.post('/auth-youtube', async (req, res) => {
  const { spawn } = await import('child_process');
  const VENV_PYTHON = join(__dirname, '../../../venv/Scripts/python.exe');
  const BACKEND = join(__dirname, '../../../backend/upload_youtube.py');

  try {
    const py = spawn(VENV_PYTHON, [BACKEND], { cwd: join(__dirname, '../../../backend') });
    let out = '';
    py.stdout.on('data', d => out += d);
    py.stderr.on('data', d => out += d);
    py.on('close', () => {
      const tokenExists = fs.existsSync(join(__dirname, '../../../data/youtube_token.json'));
      if (tokenExists) res.json({ success: true, message: 'YouTube connected!' });
      else res.status(400).json({ success: false, message: out || 'Auth failed' });
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
