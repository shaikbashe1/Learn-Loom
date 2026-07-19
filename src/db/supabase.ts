import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl) {
  throw new Error(
    '[Quovexi] VITE_SUPABASE_URL is not defined. ' +
    'Add it to your .env file: VITE_SUPABASE_URL=https://<project>.supabase.co'
  );
}
if (!supabaseAnonKey) {
  throw new Error(
    '[Quovexi] VITE_SUPABASE_ANON_KEY is not defined. ' +
    'Add it to your .env file: VITE_SUPABASE_ANON_KEY=<your-anon-key>'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
