import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log("Seeding MLS data...");

  const tracks = [
    { title: 'Placement Training', description: 'Prepare for campus placements and technical interviews', order_index: 1, icon_name: 'Briefcase' },
    { title: 'Aptitude Training', description: 'Master quantitative aptitude and logical reasoning', order_index: 2, icon_name: 'Calculator' },
    { title: 'Further Studies', description: 'Guidance for GATE, GRE, TOEFL, and higher education', order_index: 3, icon_name: 'GraduationCap' }
  ];

  for (const track of tracks) {
    const { data: insertedTrack, error: trackError } = await supabase
      .from('mls_tracks')
      .insert(track)
      .select()
      .single();

    if (trackError) {
      console.error(`Error inserting track ${track.title}:`, trackError);
      continue;
    }
    console.log(`Inserted track: ${track.title}`);

    // Seed some modules for Placement
    if (track.title === 'Placement Training') {
      const modules = [
        { track_id: insertedTrack.id, title: 'Resume Building', description: 'Learn how to craft a perfect ATS friendly resume', difficulty: 'Beginner', estimated_time_mins: 45, order_index: 1 },
        { track_id: insertedTrack.id, title: 'HR Interview Preparation', description: 'Common HR questions and how to answer them', difficulty: 'Beginner', estimated_time_mins: 60, order_index: 2 }
      ];
      for (const mod of modules) {
        await supabase.from('mls_modules').insert(mod);
      }
    }

    // Seed Aptitude
    if (track.title === 'Aptitude Training') {
      const modules = [
        { track_id: insertedTrack.id, title: 'Number System', description: 'Basics of number system and divisibility rules', difficulty: 'Intermediate', estimated_time_mins: 90, order_index: 1 },
        { track_id: insertedTrack.id, title: 'Percentages', description: 'Master percentage calculations', difficulty: 'Intermediate', estimated_time_mins: 60, order_index: 2 }
      ];
      for (const mod of modules) {
        await supabase.from('mls_modules').insert(mod);
      }
    }
  }

  console.log("Seeding complete!");
}

seed();
