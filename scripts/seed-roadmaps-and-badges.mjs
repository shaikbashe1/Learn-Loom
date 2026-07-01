import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const connectionString = 'postgresql://postgres:8333094992%40Bb@db.uxyxekustlfhzytgdbfs.supabase.co:5432/postgres';
const client = new Client({ connectionString });

async function seed() {
  try {
    await client.connect();

    // 1. Seed Badges
    const badges = [
      { name: 'First Problem', description: 'Solve your first problem', icon: 'flag', type: 'solved_count', value: 1 },
      { name: '10 Problems', description: 'Solve 10 problems', icon: 'looks_one', type: 'solved_count', value: 10 },
      { name: '50 Problems', description: 'Solve 50 problems', icon: 'looks_5', type: 'solved_count', value: 50 },
      { name: '100 Problems', description: 'Solve 100 problems', icon: '100', type: 'solved_count', value: 100 },
      { name: '7 Day Streak', description: 'Maintain a 7-day coding streak', icon: 'local_fire_department', type: 'streak_days', value: 7 },
      { name: '30 Day Streak', description: 'Maintain a 30-day coding streak', icon: 'whatshot', type: 'streak_days', value: 30 },
      { name: 'Contest Winner', description: 'Rank #1 in a weekly contest', icon: 'emoji_events', type: 'contest_rank', value: 1 }
    ];

    for (const b of badges) {
      await client.query(
        `INSERT INTO badges (name, description, icon_url, criteria_type, criteria_value)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`, // we'll just let it fail or insert duplicates if no unique constraint, but we don't have unique constraint, so we just run it once
        [b.name, b.description, b.icon, b.type, b.value]
      );
    }
    console.log('Inserted badges.');

    // 2. Fetch problems to attach to roadmaps
    const { rows: problems } = await client.query(`SELECT id FROM coding_problems LIMIT 10`);
    if (problems.length < 2) {
      console.log('Not enough problems to seed roadmaps.');
      return;
    }

    // 3. Seed Roadmaps
    const dsaRoadmap = await client.query(
      `INSERT INTO roadmaps (title, description, type, domain, estimated_weeks) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      ['Data Structures & Algorithms', 'The ultimate guide to mastering DSA for interviews.', 'Advanced', 'software-engineering', 8]
    );
    const sqlRoadmap = await client.query(
      `INSERT INTO roadmaps (title, description, type, domain, estimated_weeks) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      ['SQL & Databases', 'Master queries, joins, and database design.', 'Beginner', 'data-engineering', 4]
    );

    // 4. Seed Roadmap Topics
    await client.query(
      `INSERT INTO roadmap_topics (roadmap_id, title, description, order_index, problem_ids)
       VALUES ($1, $2, $3, $4, $5)`,
      [dsaRoadmap.rows[0].id, 'Arrays & Hashing', 'Foundation of data structures', 0, [problems[0].id]]
    );
    await client.query(
      `INSERT INTO roadmap_topics (roadmap_id, title, description, order_index, problem_ids)
       VALUES ($1, $2, $3, $4, $5)`,
      [dsaRoadmap.rows[0].id, 'Two Pointers', 'Optimize array traversals', 1, [problems[1].id]]
    );

    await client.query(
      `INSERT INTO roadmap_topics (roadmap_id, title, description, order_index, problem_ids)
       VALUES ($1, $2, $3, $4, $5)`,
      [sqlRoadmap.rows[0].id, 'Basic Queries', 'SELECT, FROM, WHERE basics', 0, [problems[0].id]]
    );

    console.log('Successfully seeded roadmaps and topics.');

  } catch (err) {
    console.error('Failed to seed:', err);
  } finally {
    await client.end();
  }
}

seed();
