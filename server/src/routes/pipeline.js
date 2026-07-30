// server/src/routes/pipeline.js
import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '../../..');
const VENV_PYTHON = 'C:\\sf_venv\\Scripts\\python.exe';
const BACKEND_MAIN = join(PROJECT_ROOT, 'backend/main.py');

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

// SSE log stream
router.get('/logs', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const interval = setInterval(() => {
    res.write(`data: ${JSON.stringify({ ping: true })}\n\n`);
  }, 15000);
  req.on('close', () => clearInterval(interval));
});

// POST /api/pipeline/run — spawns the Python backend process (or schedules it if on Vercel)
router.post('/run', async (req, res) => {
  const userId = req.user.id;
  const { topic, dry_run, skip_gate } = req.body || {};

  const isVercel = !!process.env.VERCEL;
  const run_id = `short_${Date.now()}`;

  // Insert a record immediately so the UI updates
  const { error: insertErr } = await supabase.from('runs').insert({
    user_id: userId,
    run_id,
    topic: topic || null,
    status: isVercel ? 'pending' : 'running',
    started_at: new Date().toISOString(),
  });
  if (insertErr) {
    console.error('[pipeline] DB insert error:', insertErr.message);
  }

  if (isVercel) {
    // On Vercel, we only schedule the job and let the local worker execute it
    return res.json({ run_id, status: 'pending', message: 'Pipeline scheduled (local worker will execute)' });
  }

  // Respond immediately — pipeline runs in background locally
  res.json({ run_id, status: 'running', message: 'Pipeline started' });

  // Build args
  const args = [BACKEND_MAIN];
  if (topic) args.push('--topic', topic);
  if (dry_run) args.push('--dry-run');
  if (skip_gate) args.push('--skip-gate');

  // Spawn Python (use system python if venv not found)
  const { existsSync } = await import('fs');
  const pythonBin = existsSync(VENV_PYTHON) ? VENV_PYTHON : 'python';
  const child = spawn(pythonBin, args, {
    cwd: PROJECT_ROOT,
    env: { ...process.env },
  });

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (d) => { stdout += d.toString(); process.stdout.write('[python] ' + d); });
  child.stderr.on('data', (d) => { stderr += d.toString(); process.stderr.write('[python] ' + d); });

  child.on('close', async (code) => {
    const success = code === 0;
    const status = success ? 'success' : 'failed';

    // Parse video_id / url from stdout if possible
    let video_id = null;
    let url = null;
    const urlMatch = stdout.match(/https:\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w-]+)/);
    if (urlMatch) {
      url = urlMatch[0];
      video_id = urlMatch[1];
    }

    await supabase.from('runs').update({
      status,
      finished_at: new Date().toISOString(),
      video_id,
      url,
      error: success ? null : (stderr.slice(-500) || `Exit code ${code}`),
    }).eq('run_id', run_id).eq('user_id', userId);

    console.log(`[pipeline] Run ${run_id} finished — status=${status} code=${code}`);
  });
});

export default router;
