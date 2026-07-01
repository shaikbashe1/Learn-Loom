import { Client } from 'pg';
const client = new Client({ connectionString: 'postgresql://postgres:8333094992%40Bb@db.uxyxekustlfhzytgdbfs.supabase.co:5432/postgres' });
async function run() {
  await client.connect();
  try {
    await client.query("ALTER TABLE roadmaps ADD COLUMN type text DEFAULT 'Beginner';");
    console.log('Added type column');
  } catch(e) {
    console.error(e.message);
  }
  await client.end();
}
run();
