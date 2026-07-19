require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase
    .from('coding_problems')
    .select('*')
    .eq('slug', 'generated-problem-124-4515')
    .single();
    
  if (error) {
    console.error("Error fetching:", error);
  } else {
    console.log("Problem Data:");
    console.log(JSON.stringify(data, null, 2));
    
    // Check types
    console.log("Type of company_tags:", typeof data.company_tags, Array.isArray(data.company_tags) ? "Array" : "Not Array");
    console.log("Type of constraints:", typeof data.constraints, Array.isArray(data.constraints) ? "Array" : "Not Array");
    console.log("Type of starter_code:", typeof data.starter_code);
  }
}

check();
