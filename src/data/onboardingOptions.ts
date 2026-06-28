// Static option sets for the first-time user onboarding wizard.
// Centralised here so the wizard, profile page, and analytics share one source.

export interface PersonaOption {
  value: 'student' | 'professional' | 'job_seeker' | 'teacher' | 'other';
  label: string;
  icon: string; // material-symbols icon name
}

export const PERSONAS: PersonaOption[] = [
  { value: 'student', label: 'Student', icon: 'school' },
  { value: 'professional', label: 'Working Professional', icon: 'work' },
  { value: 'job_seeker', label: 'Job Seeker', icon: 'travel_explore' },
  { value: 'teacher', label: 'Teacher', icon: 'cast_for_education' },
  { value: 'other', label: 'Other', icon: 'person' },
];

export const DREAM_ROLES = [
  'Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
  'AI Engineer', 'ML Engineer', 'Data Scientist', 'Cybersecurity Engineer', 'Cloud Engineer',
  'DevOps Engineer', 'Product Manager', 'UI/UX Designer', 'Mobile App Developer',
  'Game Developer', 'Blockchain Developer', 'Research Scientist',
];

export const DREAM_COMPANIES = [
  'Google', 'Microsoft', 'Amazon', 'Meta', 'Apple', 'Netflix', 'Adobe', 'NVIDIA', 'Tesla',
  'OpenAI', 'Infosys', 'TCS', 'Accenture', 'Wipro', 'Capgemini', 'Cognizant',
];

export interface SkillCategory {
  category: string;
  icon: string;
  skills: string[];
}

export const SKILL_CATEGORIES: SkillCategory[] = [
  { category: 'Programming', icon: 'code', skills: ['Java', 'Python', 'C++', 'JavaScript', 'Go', 'Rust'] },
  { category: 'Web', icon: 'public', skills: ['React', 'Next.js', 'Node.js', 'Express', 'Angular', 'Vue'] },
  { category: 'AI / ML', icon: 'smart_toy', skills: ['Machine Learning', 'Deep Learning', 'LLMs', 'Generative AI', 'Prompt Engineering'] },
  { category: 'Cloud', icon: 'cloud', skills: ['AWS', 'Azure', 'Google Cloud'] },
  { category: 'Database', icon: 'database', skills: ['SQL', 'MongoDB', 'PostgreSQL'] },
  { category: 'Other', icon: 'category', skills: ['Cybersecurity', 'Networking', 'DSA', 'Competitive Programming'] },
];

export interface LearningGoalOption {
  value: string;
  label: string;
  icon: string;
}

export const LEARNING_GOALS: LearningGoalOption[] = [
  { value: 'get_internship', label: 'Get Internship', icon: 'badge' },
  { value: 'crack_placements', label: 'Crack Placements', icon: 'workspace_premium' },
  { value: 'improve_coding', label: 'Improve Coding', icon: 'terminal' },
  { value: 'learn_ai', label: 'Learn AI', icon: 'neurology' },
  { value: 'build_projects', label: 'Build Projects', icon: 'construction' },
  { value: 'prepare_gate', label: 'Prepare for GATE', icon: 'menu_book' },
  { value: 'learn_new_skills', label: 'Learn New Skills', icon: 'auto_stories' },
  { value: 'get_job', label: 'Get Job', icon: 'business_center' },
  { value: 'prepare_interviews', label: 'Prepare for Interviews', icon: 'record_voice_over' },
  { value: 'other', label: 'Other', icon: 'more_horiz' },
];

export interface DailyTimeOption {
  value: string;
  label: string;
  icon: string;
}

export const DAILY_TIME_SLOTS: DailyTimeOption[] = [
  { value: '15min', label: '15 min', icon: 'timer' },
  { value: '30min', label: '30 min', icon: 'timelapse' },
  { value: '1hour', label: '1 hour', icon: 'hourglass_top' },
  { value: '2hours', label: '2 hours', icon: 'hourglass_full' },
  { value: '3plus', label: '3+ hours', icon: 'local_fire_department' },
];

export const LANGUAGES = [
  'English', 'Hindi', 'Telugu', 'Tamil', 'Kannada', 'Malayalam', 'Marathi',
  'Bengali', 'Gujarati', 'Punjabi', 'Urdu', 'Spanish', 'French', 'German',
];

export const DEGREES = [
  'B.Tech', 'B.E', 'B.Sc', 'BCA', 'B.Com', 'BBA', 'M.Tech', 'M.E', 'M.Sc',
  'MCA', 'MBA', 'PhD', 'Diploma', 'Other',
];
