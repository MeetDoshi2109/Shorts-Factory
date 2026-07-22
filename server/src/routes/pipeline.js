// server/src/routes/pipeline.js
// Spawns Python main.py and streams logs via SSE. Updates Supabase in real time.
import { Router } from 'express';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { supabase } from '../lib/supabase.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '../../../');
const BACKEND_DIR = join(PROJECT_ROOT, 'backend');
const VENV_PYTHON = join(PROJECT_ROOT, 'venv', 'Scripts', 'python.exe');

const router = Router();

// In-memory pipeline state
const pipelineState = {
  running: false,
  runId: null,
  startedAt: null,
  logs: [],
};

// ─── GET /api/pipeline/status ───────────────────────────────────────────────
router.get('/status', async (req, res) => {
  // Get last run from Supabase
  const { data: lastRun } = await supabase
    .from('runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  res.json({
    running: pipelineState.running,
    runId: pipelineState.runId,
    startedAt: pipelineState.startedAt,
    recentLogs: pipelineState.logs.slice(-50),
    lastRun: lastRun || null,
  });
});

// ─── POST /api/pipeline/run ─────────────────────────────────────────────────
router.post('/run', async (req, res) => {
  if (pipelineState.running) {
    return res.status(409).json({ error: 'Pipeline already running' });
  }

  const { topic, dry_run = false, skip_gate = false } = req.body;

  // Create run record in Supabase
  const runId = `short_${Date.now()}`;
  const { error: insertErr } = await supabase.from('runs').insert({
    run_id: runId,
    topic: topic || null,
    status: 'running',
    started_at: new Date().toISOString(),
    dry_run,
  });

  if (insertErr) {
    console.error('[pipeline] Failed to create run record:', insertErr);
  }

  // Update state
  pipelineState.running = true;
  pipelineState.runId = runId;
  pipelineState.startedAt = new Date().toISOString();
  pipelineState.logs = [];

  // Build Python args
  const args = [join(BACKEND_DIR, 'main.py')];
  if (topic) { args.push('--topic', topic); }
  if (dry_run) { args.push('--dry-run'); }
  if (skip_gate) { args.push('--skip-gate'); }

  // Spawn Python process
  const py = spawn(VENV_PYTHON, args, {
    cwd: BACKEND_DIR,
    env: { ...process.env },
  });

  const logLine = (line) => {
    pipelineState.logs.push(line);
    if (pipelineState.logs.length > 500) pipelineState.logs.shift();
  };

  py.stdout.on('data', (d) => {
    d.toString().split('\n').filter(Boolean).forEach(logLine);
  });

  py.stderr.on('data', (d) => {
    d.toString().split('\n').filter(Boolean).forEach(l => logLine(`[ERR] ${l}`));
  });

  py.on('close', async (code) => {
    pipelineState.running = false;

    // Read the latest progress JSON written by Python
    const status = code === 0 ? 'success' : 'failed';

    // Try to read result from progress file
    let result = {};
    try {
      const fs = await import('fs');
      const progressFile = join(PROJECT_ROOT, 'data', 'video_progress.json');
      if (fs.default.existsSync(progressFile)) {
        const all = JSON.parse(fs.default.readFileSync(progressFile, 'utf8'));
        result = all.find(r => r.run_id === runId) || all[all.length - 1] || {};
      }
    } catch {}

    // Update Supabase run record
    await supabase.from('runs').update({
      status,
      finished_at: new Date().toISOString(),
      elapsed_seconds: result.elapsed_seconds || null,
      title: result.title || null,
      video_id: result.video_id || null,
      url: result.url || null,
      error: result.error || (code !== 0 ? `Exit code ${code}` : null),
      gate_score: result.gate?.score || null,
      gate_verdict: result.gate?.verdict || null,
    }).eq('run_id', runId);

    // If video was uploaded, upsert into videos table
    if (result.video_id && result.url) {
      await supabase.from('videos').upsert({
        video_id: result.video_id,
        title: result.title || '',
        topic: result.topic || '',
        url: result.url,
        run_id: runId,
      }, { onConflict: 'video_id' });
    }

    pipelineState.runId = null;
  });

  res.json({
    success: true,
    runId,
    message: `Pipeline started (${dry_run ? 'DRY RUN' : 'LIVE'})`,
  });
});

// ─── GET /api/pipeline/logs (SSE stream) ────────────────────────────────────
router.get('/logs', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let lastIndex = 0;
  const interval = setInterval(() => {
    const newLogs = pipelineState.logs.slice(lastIndex);
    if (newLogs.length) {
      newLogs.forEach(line => res.write(`data: ${JSON.stringify(line)}\n\n`));
      lastIndex = pipelineState.logs.length;
    }
    res.write(`data: ${JSON.stringify({ ping: true, running: pipelineState.running })}\n\n`);
  }, 1000);

  req.on('close', () => clearInterval(interval));
});

// ─── GET /api/pipeline/runs ─────────────────────────────────────────────────
router.get('/runs', async (req, res) => {
  const limit = parseInt(req.query.limit || '50');
  const { data, error } = await supabase
    .from('runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

export default router;
