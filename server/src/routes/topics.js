// server/src/routes/topics.js
import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../../../.env') });

const router = Router();

// GET /api/topics
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('topics')
    .select('*')
    .order('added_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// POST /api/topics
router.post('/', async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'No topic text' });

  const { data, error } = await supabase
    .from('topics')
    .insert({ text: text.trim() })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/topics/:id
router.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('topics').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// POST /api/topics/generate — AI-powered topic ideas via Gemini
router.post('/generate', async (req, res) => {
  const { niche } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(400).json({ error: 'GEMINI_API_KEY not set' });

  try {
    const prompt = `Generate 5 unique, viral YouTube Shorts topics for niche: "${niche || 'personal finance'}".
Each should be scroll-stopping, specific, and emotional.
Output JSON array only: [{"topic": "...", "hook": "Opening sentence that grabs attention immediately"}]`;

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    const json = await r.json();
    const raw = json.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const ideas = JSON.parse(cleaned);
    res.json({ ideas });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
