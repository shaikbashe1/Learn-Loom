import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

const connectionString = 'postgresql://postgres:8333094992%40Bb@db.uxyxekustlfhzytgdbfs.supabase.co:5432/postgres';

const client = new Client({
  connectionString,
});

const migrations = [
  'supabase/migrations/20260628120000_onboarding_wizard.sql',
  'supabase/migrations/20260628133500_community_v2_phase1.sql',
  'supabase/migrations/20260628140000_community_v2_phase2.sql',
  'supabase/migrations/20260628200900_messaging_portal.sql',
  'supabase/migrations/20260628212000_user_followers.sql'
];

const run = async () => {
  try {
    await client.connect();
    console.log('Connected to Supabase DB successfully.');

    for (const migration of migrations) {
      console.log(`\n📄 Reading migration: ${migration}...`);
      if (!fs.existsSync(migration)) {
        console.error(`❌ Migration file not found: ${migration}`);
        continue;
      }
      const sql = fs.readFileSync(migration, 'utf8');
      
      console.log(`⚡ Applying ${path.basename(migration)}...`);
      await client.query(sql);
      console.log(`✅ ${path.basename(migration)} applied successfully!`);
    }

    // Refresh PostgREST schema cache
    console.log('\n🔄 Reloading PostgREST schema cache...');
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log('✅ PostgREST schema cache reloaded successfully!');
    console.log('\n🎉 All database migrations applied successfully!');

  } catch (err) {
    console.error('❌ Error executing SQL:', err);
  } finally {
    await client.end();
  }
};

run();
