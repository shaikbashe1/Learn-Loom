// LearnLoom Platform Type Definitions

export type UserRole = 'student' | 'instructor' | 'admin' | 'user' | 'super_admin' | 'org_admin';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  credits: number;
  streak_days: number;
  last_activity_date?: string | null;
  bio?: string | null;
  github_url?: string | null;
  linkedin_url?: string | null;
  created_at: string;
  updated_at?: string;
  courses_completed?: number;
  certificates_earned?: number;
}

export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced';

// ── Supabase DB row types ────────────────────────────────────────────────────
export interface DBCourse {
  id: string;
  title: string;
  description: string | null;
  difficulty: DifficultyLevel;
  thumbnail_url: string | null;
  youtube_url: string | null;
  notes_url: string | null;
  is_published: boolean;
  created_by: string | null;
  category: string;
  instructor: string;
  instructor_name: string;
  rating: number;
  student_count: number;
  duration_weeks: number;
  duration_hours: number;
  level: string;
  topics: string[];
  created_at: string;
  updated_at: string;
}

export interface DBModule {
  id: string;
  course_id: string;
  title: string;
  description: string;
  // Canonical columns (current schema)
  content_url: string | null;
  order_index: number;
  type: 'video' | 'reading' | 'coding';
  is_free_preview: boolean;
  duration_minutes: number;
  created_at: string;
  // Legacy columns (kept optional for backward compat with older rows)
  youtube_url?: string | null;
  notes_url?: string | null;
  sort_order?: number;
}

export interface DBAssignment {
  id: string;
  course_id: string;
  module_id?: string | null;
  title: string;
  description?: string | null;
  instructions: string | null;
  due_days: number;
  due_date?: string | null;
  max_score?: number;
  created_at: string;
}

export interface DBQuiz {
  id: string;
  course_id: string;
  module_id: string | null;
  title: string;
  is_grand_test: boolean;
  time_limit_minutes?: number;
  passing_score: number;
  created_at: string;
}

export interface DBAssignmentSubmission {
  id: string;
  user_id: string;
  assignment_id: string;
  answer_text: string;
  file_url?: string | null;
  status: 'submitted' | 'graded';
  score: number | null;
  feedback: string | null;
  submitted_at: string;
  graded_at: string | null;
}

export interface DBQuizAttempt {
  id: string;
  user_id: string;
  quiz_id: string;
  answers: number[];
  score: number;
  total: number;
  passed: boolean;
  completed_at: string;
}

export interface DBQuizQuestion {
  id: string;
  quiz_id: string;
  question: string;
  question_text?: string;
  options: string[];
  answer_index: number;
  correct_index?: number;
  explanation?: string | null;
  sort_order: number;
}

export interface DBCertificate {
  id: string;
  user_id: string;
  course_id: string;
  issued_at: string;
  verification_code: string;
  is_valid: boolean;
  revoked: boolean;
  score?: number;
  courses?: { title: string; instructor_name: string; instructor: string } | null;
  profiles?: { full_name: string | null; email: string | null } | null;
}

export interface DBNotification {
  id: string;
  user_id: string;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface DBAIConversation {
  id: string;
  user_id: string;
  title: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface DBCodingProblem {
  id: string;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  category: string;
  examples: { input: string; output: string; explanation?: string }[];
  test_cases: { input: string; expectedOutput: string }[];
  starter_code: Record<string, string>;
  is_daily?: boolean;
  credits?: number;
}

export interface DBGrandTestQuestion {
  id: string;
  course_id: string | null;
  question: string;
  options: string[] | string;
  correct_idx: number;
  explanation: string | null;
  sort_order: number;
  created_at: string;
}

export interface DBGrandTestAttempt {
  id: string;
  user_id: string;
  course_id?: string | null;
  score: number;
  total: number;
  passed: boolean;
  tab_switches: number;
  answers: Record<string, unknown>[] | null;
  submitted_at: string;
}

export interface LeaderboardEntry {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  credits: number;
  streak_days: number;
  courses_completed: number;
  certificates_earned: number;
  rank: number;
}

export interface AdminStats {
  published_courses: number;
  total_courses: number;
  total_students: number;
  total_quizzes: number;
  total_assignments: number;
  active_certificates: number;
  grand_test_passes: number;
  total_enrollments: number;
  // Extended fields (added in migration 00017)
  completed_enrollments: number;
  total_quiz_attempts: number;
  total_submissions: number;
  forum_posts_count: number;
}

export type ModuleStatus = 'locked' | 'unlocked' | 'completed';

export interface DBEnrollment {
  id: string;
  user_id: string;
  course_id: string;
  progress_percent: number;
  last_module_id: string | null;
  enrolled_at: string;
  completed_at: string | null;
}

export interface DBModuleProgress {
  id: string;
  user_id: string;
  module_id: string;
  course_id: string;
  status: ModuleStatus;
  completed_at: string | null;
}

export interface ModuleWithStatus extends DBModule {
  status: ModuleStatus;
}

export interface EnrollmentWithCourse extends DBEnrollment {
  course: DBCourse;
  last_module: DBModule | null;
}





export type RoadmapDomain = 'data-science' | 'web-development' | 'ai-ml' | 'cybersecurity' | 'dsa';

export interface RoadmapWeek {
  week: number;
  title: string;
  tasks: string[];
  resources: { title: string; url: string; type: 'video' | 'article' | 'practice' }[];
  goal: string;
}

export interface Roadmap {
  domain: RoadmapDomain;
  title: string;
  totalWeeks: number;
  weeks: RoadmapWeek[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}


