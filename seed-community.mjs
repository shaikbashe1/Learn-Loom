import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.log("Missing URL or KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

async function seed() {
  // 1. Log in with previously created user
  const email = 'seeder_1781535243930@learnloom.com';
  const password = 'securepassword123';
  
  console.log("Signing in as", email);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (authError) {
    console.error("Auth error:", authError);
    return;
  }
  
  if (authData.session) {
    await supabase.auth.setSession({
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token
    });
  }
  
  const userId = authData.user?.id;
  if (!userId) {
    console.error("No user ID returned");
    return;
  }
  
  console.log("User created:", userId);
  
  // Create a new client authenticated with the user's token
  const authSupabase = createClient(url, key, {
    global: {
      headers: {
        Authorization: `Bearer ${authData.session.access_token}`
      }
    }
  });
  
  // Wait a second for trigger to create profile
  await new Promise(r => setTimeout(r, 2000));
  
  // 2. Insert posts
  const posts = [
    {
      user_id: userId,
      title: "Welcome to the LearnLoom Community! \uD83D\uDE80",
      content: "This is our new community forum. Feel free to introduce yourself, ask questions about courses, and share your achievements!",
      category: "general",
      is_pinned: true,
      tags: ["welcome", "announcement"]
    },
    {
      user_id: userId,
      title: "Need help with React useEffect dependencies",
      content: "I'm working on the React Masters course and my useEffect is running infinitely. I've tried adding empty brackets but then it doesn't update when my state changes. What is the best practice for depending on functions?",
      category: "doubt",
      tags: ["react", "hooks", "help"]
    },
    {
      user_id: userId,
      title: "System Design Challenge: Scaling a URL Shortener",
      content: "For this week's challenge, how would you design a URL shortener that handles 100M new URLs per month and 1B redirects? Discuss your choice of database, caching strategy, and ID generation.",
      category: "challenge",
      tags: ["system-design", "architecture"]
    }
  ];
  
  console.log("Inserting posts...");
  const { data: insertData, error: insertError } = await authSupabase
    .from('forum_posts')
    .insert(posts)
    .select();
    
  if (insertError) {
    console.error("Insert error:", insertError);
  } else {
    console.log("Successfully inserted", insertData?.length, "posts!");
    
    // 3. Add a reply to one of them
    if (insertData && insertData.length > 1) {
      const postId = insertData[1].id;
      console.log("Adding a reply to post", postId);
      const { error: replyErr } = await authSupabase.from('forum_replies').insert({
        post_id: postId,
        user_id: userId,
        content: "If your function is defined inside the component, wrap it in useCallback! Otherwise, move it outside the component if it doesn't depend on state."
      });
      if (replyErr) console.error("Reply error:", replyErr);
      else console.log("Reply added successfully.");
    }
  }
}

seed();
