import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

const connectionString = 'postgresql://postgres:8333094992%40Bb@db.uxyxekustlfhzytgdbfs.supabase.co:5432/postgres';

const client = new Client({ connectionString });

const run = async () => {
  try {
    await client.connect();
    console.log('Connected to Supabase DB successfully.');
    const m1 = fs.readFileSync('supabase/migrations/20260701000000_coding_module.sql', 'utf8');
    const m2 = fs.readFileSync('supabase/migrations/20260701000001_coding_problems_expansion.sql', 'utf8');
    const m3 = fs.readFileSync('supabase/migrations/20260701000002_daily_challenge_rpc.sql', 'utf8');
    const m4 = fs.readFileSync('supabase/migrations/20260701000003_contest_participants.sql', 'utf8');
    const m5 = fs.readFileSync('supabase/migrations/20260701000004_progress_triggers.sql', 'utf8');
    
    await client.query(m1);
    console.log('Applied 20260701000000_coding_module.sql');
    await client.query(m2);
    console.log('Applied 20260701000001_coding_problems_expansion.sql');
    await client.query(m3);
    console.log('Applied 20260701000002_daily_challenge_rpc.sql');
    await client.query(m4);
    console.log('Applied 20260701000003_contest_participants.sql');
    await client.query(m5);
    console.log('Applied 20260701000004_progress_triggers.sql');
    
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log('Schema reloaded!');
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
};
run();
