// server/src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // service role key for server

if (!supabaseUrl || !supabaseKey) {
  console.warn('[supabase] WARNING: SUPABASE_URL or SUPABASE_SERVICE_KEY missing in .env');
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '');
