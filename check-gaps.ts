import { getRow } from './src/lib/db';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const db = await getRow('main_db');
  console.log("Intel Cache Count:", db?.intelCache?.length || 0);
  
  const muse = await getRow('muse_cards');
  console.log("Muse Cards Count:", muse?.length || 0);
  
  const psyche = await getRow('user_psyche');
  console.log("User Psyche Present:", !!psyche);

  const { count: promptCount } = await supabase.from('prompts').select('*', { count: 'exact', head: true });
  console.log("Prompt Bank Count:", promptCount);
}

check();
