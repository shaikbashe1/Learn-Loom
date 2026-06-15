import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.log("Missing URL or KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

async function test() {
  const { data, error } = await supabase
        .from('forum_posts')
        .select('*')
        .limit(5);
        
  if (error) {
    console.log("ERROR:", error);
  } else {
    console.log("DATA:", data);
  }
}

test();
