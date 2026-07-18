import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

const connectionString = 'postgresql://postgres:8333094992%40Bb@db.uxyxekustlfhzytgdbfs.supabase.co:5432/postgres';

const client = new Client({ connectionString });

const run = async () => {
  try {
    await client.connect();
    console.log('Connected to Supabase DB successfully.');
    
    const migration = 'supabase/migrations/20260718000000_coding_tracking_v2.sql';
    const sql = fs.readFileSync(migration, 'utf8');
    
    console.log(`Applying ${path.basename(migration)}...`);
    await client.query(sql);
    console.log('Migration applied successfully!');
    
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log('Schema reloaded!');
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
};
run();
