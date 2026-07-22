// server/src/index.js — Express API server for Shorts Factory
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { supabase } from './lib/supabase.js';

import pipelineRouter from './routes/pipeline.js';
import topicsRouter from './routes/topics.js';
import analyticsRouter from './routes/analytics.js';
import settingsRouter from './routes/settings.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../../.env') });

const app = express();
const PORT = process.env.SERVER_PORT || process.env.PORT || 8899;

// ─── Middleware ────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// Auth Middleware: Verifies Supabase JWT token
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing Authorization header' });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = user; // attach user object to request
  next();
};

// ─── Routes ────────────────────────────────────────────────────────────────
// Apply auth middleware to all protected routes
app.use('/api/pipeline', requireAuth, pipelineRouter);
app.use('/api/topics', requireAuth, topicsRouter);
app.use('/api/analytics', requireAuth, analyticsRouter);
app.use('/api/settings', requireAuth, settingsRouter);

// ─── Health Check ──────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    multi_tenant: true
  });
});

// ─── Comments proxy ───────────────────────────────────────────────────────
app.get('/api/comments/:videoId', requireAuth, async (req, res) => {
  const { videoId } = req.params;
  res.json({
    videoId,
    comments: [],
    note: 'Connect YouTube to fetch comments.',
  });
});

// Export app for serverless Vercel function
export default app;

// Listen only when run directly (not serverless)
if (process.env.NODE_ENV !== 'production' || process.env.IS_LOCAL === 'true') {
  app.listen(PORT, () => {
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`  Shorts Factory Server (Multi-Tenant) →  http://localhost:${PORT}`);
    console.log(`${'─'.repeat(50)}\n`);
  });
}
