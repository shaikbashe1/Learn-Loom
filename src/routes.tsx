import { lazy, type ReactNode, type ComponentType } from 'react';

// Lazy-loaded public pages
const LandingPage         = lazy(() => import('./pages/LandingPage'));
const LoginPage           = lazy(() => import('./pages/auth/LoginPage'));
const SignupPage          = lazy(() => import('./pages/auth/SignupPage'));
const ForgotPasswordPage  = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage   = lazy(() => import('./pages/auth/ResetPasswordPage'));
const EmailVerificationPage = lazy(() => import('./pages/auth/EmailVerificationPage'));
const ProfileSetupPage    = lazy(() => import('./pages/auth/ProfileSetupPage'));
const OnboardingPage      = lazy(() => import('./pages/auth/OnboardingPage'));
const AuthCallbackPage    = lazy(() => import('./pages/auth/AuthCallbackPage'));
const CertVerifyPage      = lazy(() => import('./pages/student/CertVerifyPage'));

// Lazy-loaded student pages
const StudentDashboard    = lazy(() => import('./pages/student/StudentDashboard'));
const CourseCatalogPage   = lazy(() => import('./pages/student/CourseCatalogPage'));
const CourseDetailPage    = lazy(() => import('./pages/student/CourseDetailPage'));
const CoursePlayerPage    = lazy(() => import('./pages/student/CoursePlayerPage'));
const AIRoadmapPage       = lazy(() => import('./pages/student/AIRoadmapPage'));
const AIMentorPage        = lazy(() => import('./pages/student/AIMentorPage'));
const CodingDashboardPage = lazy(() => import('./pages/coding/DashboardPage'));
const CodingPracticeLibraryPage = lazy(() => import('./pages/coding/PracticePage'));
const CodingProblemPage = lazy(() => import('./pages/coding/ProblemPage'));
const CodingDailyChallengePage = lazy(() => import('./pages/coding/DailyChallengePage'));
const CodingRoadmapsPage = lazy(() => import('./pages/coding/RoadmapsPage'));
const CodingRoadmapDetailPage = lazy(() => import('./pages/coding/RoadmapDetailPage'));
const CodingContestsPage = lazy(() => import('./pages/coding/ContestsPage'));
const CodingContestDetailPage = lazy(() => import('./pages/coding/ContestDetailPage'));
const CodingLeaderboardPage = lazy(() => import('./pages/coding/LeaderboardPage'));
const CodingAchievementsPage = lazy(() => import('./pages/coding/AchievementsPage'));
const CodingSubmissionsPage = lazy(() => import('./pages/coding/SubmissionsPage'));
const CodingAssessmentPage = lazy(() => import('./pages/student/CodingAssessmentPage'));
const QuizPage            = lazy(() => import('./pages/student/QuizPage'));
const GrandTestPage       = lazy(() => import('./pages/student/GrandTestPage'));
const AssignmentPage      = lazy(() => import('./pages/student/AssignmentPage'));
const LeaderboardPage     = lazy(() => import('./pages/student/LeaderboardPage'));
const CommunityPage       = lazy(() => import('./pages/student/CommunityPage'));
const FinalAssessmentPage = lazy(() => import('./pages/student/FinalAssessmentPage'));
const CertificatePage     = lazy(() => import('./pages/student/CertificatePage'));
const ProfilePage         = lazy(() => import('./pages/student/ProfilePage'));
const PublicProfilePage   = lazy(() => import('./pages/student/PublicProfilePage'));
const PricingPage         = lazy(() => import('./pages/student/PricingPage'));
const PaymentHistoryPage  = lazy(() => import('./pages/student/PaymentHistoryPage'));
const SearchPage          = lazy(() => import('./pages/student/SearchPage'));
const MessagesPage        = lazy(() => import('./pages/student/MessagesPage'));

// Lazy-loaded admin pages
const AdminDashboard      = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminCoursesPage    = lazy(() => import('./pages/admin/AdminCoursesPage'));
const AdminStudentsPage   = lazy(() => import('./pages/admin/AdminStudentsPage'));
const AdminCertsPage      = lazy(() => import('./pages/admin/AdminCertificatesPage'));
const AdminReportsPage    = lazy(() => import('./pages/admin/AdminReportsPage'));
const AdminCommunityPage  = lazy(() => import('./pages/admin/AdminCommunityPage'));
const AdminSubmissionsPage = lazy(() => import('./pages/admin/AdminSubmissionsPage'));
const AdminRoadmapsPage   = lazy(() => import('./pages/admin/AdminRoadmapsPage'));
const AdminDraftCoursesPage = lazy(() => import('./pages/admin/AdminDraftCoursesPage').then(module => ({ default: module.AdminDraftCoursesPage })));
const AdminCodingProblemsPage = lazy(() => import('./pages/admin/AdminCodingProblemsPage'));

export interface RouteConfig {
  name: string;
  path: string;
  component: ComponentType;
  element?: ReactNode;
  public?: boolean;
}

export const routes: RouteConfig[] = [
  // ── Public ──────────────────────────────────────────────────────────
  { name: 'Landing',              path: '/',                  component: LandingPage,           public: true },
  { name: 'Login',                path: '/login',             component: LoginPage,             public: true },
  { name: 'Signup',               path: '/signup',            component: SignupPage,            public: true },
  { name: 'Forgot Password',      path: '/forgot-password',   component: ForgotPasswordPage,    public: true },
  { name: 'Reset Password',       path: '/reset-password',    component: ResetPasswordPage,     public: true },
  { name: 'Email Verification',   path: '/verify-email',      component: EmailVerificationPage, public: true },
  { name: 'Profile Setup',        path: '/profile-setup',     component: ProfileSetupPage,      public: true },
  { name: 'Auth Callback',        path: '/auth/callback',     component: AuthCallbackPage,      public: true },
  { name: 'Onboarding',           path: '/onboarding',        component: OnboardingPage },
  { name: 'Cert Verify',          path: '/verify/:code',      component: CertVerifyPage,        public: true },

  // ── Student ──────────────────────────────────────────────────────────
  { name: 'Dashboard',            path: '/dashboard',               component: StudentDashboard },
  { name: 'Course Catalog',       path: '/courses',                 component: CourseCatalogPage },
  { name: 'Course Detail',        path: '/courses/:id',             component: CourseDetailPage },
  { name: 'Course Player',        path: '/courses/:id/learn/:moduleId', component: CoursePlayerPage },
  { name: 'AI Roadmap',           path: '/ai-roadmap',              component: AIRoadmapPage },
  { name: 'AI Mentor',            path: '/ai-mentor',               component: AIMentorPage },
  { name: 'Coding Dashboard',     path: '/coding/dashboard',        component: CodingDashboardPage },
  { name: 'Coding Practice',      path: '/coding/practice',         component: CodingPracticeLibraryPage },
  { name: 'Coding Problem',       path: '/coding/problems/:id',     component: CodingProblemPage },
  { name: 'Daily Challenge',      path: '/coding/daily',            component: CodingDailyChallengePage },
  { name: 'Coding Roadmaps',      path: '/coding/roadmaps',         component: CodingRoadmapsPage },
  { name: 'Roadmap Detail',       path: '/coding/roadmaps/:id',     component: CodingRoadmapDetailPage },
  { name: 'Coding Contests',      path: '/coding/contests',         component: CodingContestsPage },
  { name: 'Contest Detail',       path: '/coding/contests/:id',     component: CodingContestDetailPage },
  { name: 'Coding Leaderboard',   path: '/coding/leaderboard',      component: CodingLeaderboardPage },
  { name: 'Coding Achievements',  path: '/coding/achievements',     component: CodingAchievementsPage },
  { name: 'Coding Submissions',   path: '/coding/submissions',      component: CodingSubmissionsPage },
  { name: 'Coding Assessment',    path: '/courses/:id/coding-assessment', component: CodingAssessmentPage },
  { name: 'Quiz',                 path: '/quiz/:id',                component: QuizPage },
  { name: 'Grand Test',           path: '/grand-test',              component: GrandTestPage },
  { name: 'Assignment',           path: '/assignments/:id',         component: AssignmentPage },
  { name: 'Assignments',          path: '/assignments',             component: AssignmentPage },
  { name: 'Leaderboard',          path: '/leaderboard',             component: LeaderboardPage },
  { name: 'Community',            path: '/community',               component: CommunityPage },
  { name: 'Final Assessment',     path: '/courses/:id/assessment',  component: FinalAssessmentPage },
  { name: 'Certificates',         path: '/certificates',            component: CertificatePage },
  { name: 'Profile',              path: '/profile',                 component: ProfilePage },
  { name: 'Public Profile',       path: '/profile/:id',             component: PublicProfilePage },
  { name: 'Search',               path: '/search',                  component: SearchPage },
  { name: 'Messages',             path: '/messages',                component: MessagesPage },
  { name: 'Pricing',              path: '/pricing',                 component: PricingPage,       public: true },
  { name: 'Payment History',      path: '/payment-history',         component: PaymentHistoryPage },

  // ── Admin ─────────────────────────────────────────────────────────────
  { name: 'Admin Dashboard',      path: '/admin',                   component: AdminDashboard },
  { name: 'Admin Courses',        path: '/admin/courses',           component: AdminCoursesPage },
  { name: 'Admin Students',       path: '/admin/students',          component: AdminStudentsPage },
  { name: 'Admin Certificates',   path: '/admin/certificates',      component: AdminCertsPage },
  { name: 'Admin Reports',        path: '/admin/reports',           component: AdminReportsPage },
  { name: 'Admin Community',      path: '/admin/community',         component: AdminCommunityPage },
  { name: 'Admin Submissions',    path: '/admin/submissions',       component: AdminSubmissionsPage },
  { name: 'Admin Roadmaps',       path: '/admin/roadmaps',          component: AdminRoadmapsPage },
  { name: 'Review Drafts',        path: '/admin/courses/drafts',    component: AdminDraftCoursesPage },
  { name: 'Admin Coding Problems', path: '/admin/coding/problems',  component: AdminCodingProblemsPage },
];
