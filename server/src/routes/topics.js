// server/src/routes/topics.js
import { Router } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

// GET /api/topics
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('topics')
    .select('*')
    .eq('user_id', req.user.id)
    .order('added_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/topics
router.post('/', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Text required' });

  const { data, error } = await supabase
    .from('topics')
    .insert([{ text, user_id: req.user.id }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/topics/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase
    .from('topics')
    .delete()
    .eq('id', id)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;
