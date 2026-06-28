import { Client } from 'pg';

const connectionString = 'postgresql://postgres:8333094992%40Bb@db.uxyxekustlfhzytgdbfs.supabase.co:5432/postgres';

const client = new Client({
  connectionString,
});

const run = async () => {
  try {
    await client.connect();
    
    const convs = await client.query(`SELECT * FROM public.conversations`);
    console.log('Conversations:', convs.rows);
    
    const parts = await client.query(`SELECT * FROM public.conversation_participants`);
    console.log('Participants:', parts.rows);
    
    const msgs = await client.query(`SELECT * FROM public.messages`);
    console.log('Messages:', msgs.rows);
    
  } catch (err) {
    console.error('Error executing SQL:', err);
  } finally {
    await client.end();
  }
};

run();
