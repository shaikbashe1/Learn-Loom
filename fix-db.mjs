import { Client } from 'pg';
import fs from 'fs';

const connectionString = 'postgresql://postgres:8333094992%40Bb@db.uxyxekustlfhzytgdbfs.supabase.co:5432/postgres';

const client = new Client({
  connectionString,
});

const run = async () => {
  try {
    await client.connect();
    console.log('Connected to Supabase DB successfully.');

    const sql = fs.readFileSync('supabase/migrations/20260628212000_user_followers.sql', 'utf8');

    console.log('Applying user_followers migration...');
    await client.query(sql);
    console.log('Migration applied successfully!');
    
  } catch (err) {
    console.error('Error executing SQL:', err);
  } finally {
    await client.end();
  }
};

run();
