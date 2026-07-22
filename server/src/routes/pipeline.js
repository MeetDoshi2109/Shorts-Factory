// server/src/routes/pipeline.js
import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VENV_PYTHON = join(__dirname, '../../../venv/Scripts/python.exe');
const BACKEND_MAIN = join(__dirname, '../../../backend/main.py');

const router = Router();

// GET /api/pipeline/runs
router.get('/runs', async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const { data, error } = await supabase
    .from('runs')
    .select('*')
    .eq('user_id', req.user.id)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// SSE endpoint is tricky with JWT in browser Native EventSource
// So we just allow it, but we can't securely filter by user without token in URL
// For simplicity, we bypass auth for the SSE stream or use a token query param
router.get('/logs', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  // Just a heartbeat for now
  const interval = setInterval(() => {
    res.write(`data: ${JSON.stringify({ ping: true })}\n\n`);
  }, 15000);
  req.on('close', () => clearInterval(interval));
});

// POST /api/pipeline/run
router.post('/run', async (req, res) => {
  res.status(501).json({ error: 'Local python pipeline execution is disabled in multi-tenant cloud mode.' });
});

export default router;
