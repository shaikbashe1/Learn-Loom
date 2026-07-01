import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const connectionString = 'postgresql://postgres:8333094992%40Bb@db.uxyxekustlfhzytgdbfs.supabase.co:5432/postgres';
const client = new Client({ connectionString });

async function seedContests() {
  try {
    await client.connect();
    
    // First, verify we have at least some coding problems to link
    const { rows: problems } = await client.query(`SELECT id FROM coding_problems LIMIT 5`);
    if (problems.length === 0) {
      console.log('No coding problems found to associate with contests. Please seed problems first.');
      return;
    }
    
    const now = new Date();
    
    const pastStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    const pastEnd = new Date(pastStart.getTime() + 2 * 60 * 60 * 1000); // 2 hours later
    
    const activeStart = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes ago
    const activeEnd = new Date(activeStart.getTime() + 2 * 60 * 60 * 1000); // ends in 1.5 hours
    
    const upcomingStart = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // in 2 days
    const upcomingEnd = new Date(upcomingStart.getTime() + 2 * 60 * 60 * 1000); // 2 hours later

    const contestsToInsert = [
      { title: 'Weekly Coder Challenge #40', description: 'Past weekly contest.', start_time: pastStart, end_time: pastEnd },
      { title: 'LearnLoom Sprint #1', description: 'Solve algorithms as fast as possible.', start_time: activeStart, end_time: activeEnd },
      { title: 'Weekly Coder Challenge #41', description: 'Upcoming weekly contest.', start_time: upcomingStart, end_time: upcomingEnd }
    ];

    for (const c of contestsToInsert) {
      const { rows: inserted } = await client.query(
        `INSERT INTO contests (title, description, start_time, end_time) VALUES ($1, $2, $3, $4) RETURNING id`,
        [c.title, c.description, c.start_time.toISOString(), c.end_time.toISOString()]
      );
      
      const contestId = inserted[0].id;
      
      // Associate problems
      for (let i = 0; i < Math.min(3, problems.length); i++) {
        await client.query(
          `INSERT INTO contest_problems (contest_id, problem_id, points, order_index) VALUES ($1, $2, $3, $4)`,
          [contestId, problems[i].id, (i + 1) * 100, i]
        );
      }
      console.log(`Inserted contest: ${c.title} with ${Math.min(3, problems.length)} problems.`);
    }
    
    console.log('Successfully seeded contests.');
  } catch (err) {
    console.error('Failed to seed contests:', err);
  } finally {
    await client.end();
  }
}

seedContests();
