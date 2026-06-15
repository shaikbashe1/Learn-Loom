-- Create the roadmaps table
CREATE TABLE IF NOT EXISTS public.roadmaps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    domain TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    estimated_weeks INTEGER NOT NULL,
    phases JSONB NOT NULL DEFAULT '[]'::jsonb,
    quiz_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.roadmaps ENABLE ROW LEVEL SECURITY;

-- Policies for roadmaps
-- Anyone can read roadmaps
CREATE POLICY "Roadmaps are viewable by everyone" ON public.roadmaps FOR SELECT USING (true);

-- Only admins can insert/update/delete roadmaps
CREATE POLICY "Admins can manage roadmaps" ON public.roadmaps 
FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Insert seed data for the 5 core domains
INSERT INTO public.roadmaps (domain, title, description, estimated_weeks, phases, quiz_questions)
VALUES 
(
  'data-science', 
  'Data Science Master Track', 
  'Master data manipulation, analysis, and visualization using Python and modern data science tools.',
  12,
  '[
    {
      "phase": 1,
      "title": "Python for Data Science",
      "duration_weeks": 2,
      "topics": ["Variables & Data Types", "Loops & Functions", "NumPy Basics"],
      "resources": [],
      "milestone": "Comfortably write Python scripts for basic data manipulation"
    },
    {
      "phase": 2,
      "title": "Data Analysis with Pandas",
      "duration_weeks": 3,
      "topics": ["DataFrames", "Data Cleaning", "Aggregations"],
      "resources": [],
      "milestone": "Clean and analyze real-world datasets"
    }
  ]'::jsonb,
  '[]'::jsonb
),
(
  'web-development', 
  'Full Stack Web Development', 
  'Build scalable web applications from scratch using React, Node, and modern databases.',
  16,
  '[
    {
      "phase": 1,
      "title": "Frontend Fundamentals",
      "duration_weeks": 3,
      "topics": ["HTML5/CSS3", "JavaScript ES6+", "DOM Manipulation"],
      "resources": [],
      "milestone": "Build responsive interactive websites"
    },
    {
      "phase": 2,
      "title": "React & State Management",
      "duration_weeks": 4,
      "topics": ["Components & Hooks", "Context API", "React Router"],
      "resources": [],
      "milestone": "Build SPAs with React"
    }
  ]'::jsonb,
  '[]'::jsonb
),
(
  'ai-ml', 
  'Artificial Intelligence & Machine Learning', 
  'Dive deep into machine learning algorithms, deep learning, and AI model deployment.',
  20,
  '[
    {
      "phase": 1,
      "title": "Mathematics & Statistics",
      "duration_weeks": 4,
      "topics": ["Linear Algebra", "Calculus", "Probability"],
      "resources": [],
      "milestone": "Understand the math behind ML algorithms"
    },
    {
      "phase": 2,
      "title": "Classical Machine Learning",
      "duration_weeks": 5,
      "topics": ["Regression", "Classification", "Clustering"],
      "resources": [],
      "milestone": "Train and evaluate ML models using Scikit-Learn"
    }
  ]'::jsonb,
  '[]'::jsonb
),
(
  'cybersecurity', 
  'Cybersecurity Foundations', 
  'Learn network security, ethical hacking, and how to defend against modern threats.',
  14,
  '[
    {
      "phase": 1,
      "title": "Networking & Protocols",
      "duration_weeks": 3,
      "topics": ["TCP/IP", "DNS & HTTP", "Network Topologies"],
      "resources": [],
      "milestone": "Understand how networks operate and can be exploited"
    },
    {
      "phase": 2,
      "title": "Ethical Hacking Basics",
      "duration_weeks": 4,
      "topics": ["Reconnaissance", "Scanning", "Vulnerability Assessment"],
      "resources": [],
      "milestone": "Perform basic security audits"
    }
  ]'::jsonb,
  '[]'::jsonb
),
(
  'dsa', 
  'Data Structures & Algorithms', 
  'Master DSA for technical interviews and competitive programming.',
  18,
  '[
    {
      "phase": 1,
      "title": "Basic Data Structures",
      "duration_weeks": 3,
      "topics": ["Arrays & Strings", "Linked Lists", "Stacks & Queues"],
      "resources": [],
      "milestone": "Solve fundamental algorithmic problems"
    },
    {
      "phase": 2,
      "title": "Advanced Trees & Graphs",
      "duration_weeks": 4,
      "topics": ["Binary Search Trees", "Graph Traversal", "Shortest Path"],
      "resources": [],
      "milestone": "Solve complex graph and tree problems"
    }
  ]'::jsonb,
  '[]'::jsonb
)
ON CONFLICT (domain) DO NOTHING;
