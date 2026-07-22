// server/src/index.js — Express API server for Shorts Factory
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import pipelineRouter from './routes/pipeline.js';
import topicsRouter from './routes/topics.js';
import analyticsRouter from './routes/analytics.js';
import settingsRouter from './routes/settings.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../../.env') });

const app = express();
const PORT = process.env.SERVER_PORT || 8899;

// ─── Middleware ────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// ─── Routes ────────────────────────────────────────────────────────────────
app.use('/api/pipeline', pipelineRouter);
app.use('/api/topics', topicsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/settings', settingsRouter);

// ─── Health Check ──────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    env: {
      gemini: !!process.env.GEMINI_API_KEY,
      youtube: !!(process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET),
      supabase: !!process.env.SUPABASE_URL,
    },
  });
});

// ─── Comments proxy (YouTube Data API) ────────────────────────────────────
app.get('/api/comments/:videoId', async (req, res) => {
  const { videoId } = req.params;
  const apiKey = process.env.YOUTUBE_API_KEY_SERVER || process.env.GEMINI_API_KEY;
  // Note: YouTube Data API v3 uses a different key - the OAuth token
  // For now return empty with a note
  res.json({
    videoId,
    comments: [],
    note: 'Connect YouTube to fetch comments.',
  });
});

// ─── Start ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  Shorts Factory Server  →  http://localhost:${PORT}`);
  console.log(`${'─'.repeat(50)}\n`);
});
