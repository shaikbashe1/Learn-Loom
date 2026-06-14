import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://uxyxekustlfhzytgdbfs.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4eXhla3VzdGxmaHp5dGdkYmZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4OTg0NzAsImV4cCI6MjA5NjQ3NDQ3MH0.rGQqZhlN6xKcAujPL8amBhAzq2WUQkP1HrRzjk1M5g0');

async function testInsert() {
  const { data, error } = await supabase
    .from('profiles')
    .insert([{ id: 'user_2xyz123', email: 'test@test.com', full_name: 'Test', role: 'student' }])
    .select('*')
    .single();
  
  console.log("Error:", error);
}

testInsert();
