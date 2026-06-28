# LearnLoom Project Context

This document summarizes the architectural decisions, recent changes, encountered issues, their resolutions, and the reference folder structure for the LearnLoom platform.

## Overview
LearnLoom is an advanced, AI-driven learning ecosystem designed for software engineers. It features a robust frontend built with React/Vite, a backend powered by Supabase, and self-hosted code execution environments. 

## What We Have Done So Far

### 1. Enterprise Admin Panel Implementation (Phases 1-6)
- **RBAC & Orgs:** Implemented robust Role-Based Access Control and Organization management.
- **Job Board:** Added native capabilities for posting jobs and reviewing applications.
- **Curriculum & Execution:** Configured manual course approvals and integrated a local Piston instance for code execution (replacing Judge0).
- **AI Tooling:** Added management panels for AI Roadmaps, AI Resumes, and Loomie AI settings (prompts, tokens, limits).
- **Economy & Notifications:** Built systems for manual certificate issuance, reward points, and global/targeted notifications.
- **Analytics & Auditing:** Added comprehensive reporting metrics and an immutable audit log for sensitive admin actions.

### 2. Authentication Migration (Supabase Native)
- **Removed Clerk:** Completely stripped out `@clerk/clerk-react` and `@clerk/ui` dependencies.
- **Supabase Auth:** Migrated the entire authentication flow (Email/Password, Google OAuth) to use `@supabase/supabase-js` directly.
- **Custom UI:** Refactored `LoginPage.tsx`, `SignupPage.tsx`, and `AppLayout.tsx` to handle authentication without Clerk's pre-built UI.

### 3. Frontend Component Refactoring
- **Landing Page Modularization:** Extracted monolithic JSX blocks from `LandingPage.tsx` into smaller, reusable components (`TopAppBar`, `HeroSection`, `PricingSection`, etc.) utilizing data mapping to drastically reduce repetition.

### 4. Global UI/UX Redesign (Premium Glassmorphism)
- **Design System Overhaul:** Migrated the entire project to a new premium glassmorphism design system using updated HTML/CSS templates from the `stitch_learnloom_ai_edtech_landing` source.
- **Global CSS & Typography:** Replaced generic styles with a structured HSL color system in `index.css`. Adopted modern fonts (Inter, JetBrains Mono, Hanken Grotesk).
- **Layout Upgrades:** Restyled the core `AppLayout`, `TopAppBar`, `SideNav`, and mobile `BottomNavBar` to feature backdrop blurring, dynamic floating effects, and rich hover animations.
- **Page Migrations (Completed Batches):** Updated several core views including Auth pages, Dashboards, Course Player, Course Catalog, Course Detail, Pricing, and the entirety of Batch 3 (Student Tools) containing `AIRoadmapPage`, `CodingPracticePage`, `QuizPage`, `AssignmentPage`, and `GrandTestPage` with the sophisticated glassmorphism aesthetic.
- **Bug Fixes:** Fixed Vite build errors related to invalid `lucide-react` icon exports in Admin pages (`AdminCertificatesPage`, `AdminReportsPage`, `AdminCommunityPage`, `AdminSubmissionsPage`).
- **Admin Dashboard & Extension Pages:** Successfully migrated all enterprise admin views, including `AdminDashboard`, `AdminCoursesPage`, `AdminStudentsPage`, `AdminReportsPage`, `AdminCommunityPage`, `AdminCertificatesPage`, `AdminRoadmapsPage`, `AdminSubmissionsPage`, `AdminJobsPage`, `AdminNotificationsPage`, `AdminOrganizationsPage`, `AdminResumesPage`, `AdminRewardsPage`, `AdminCompilerPage`, `AdminAISettingsPage`, and `AdminGrandTestPage`, to utilize the premium `AppLayout` wrapper and glass-panel utility classes.

### 5. Production Security Hardening & Vulnerability Remediation
- **API Access Control:** Implemented route-level authorization verification in Vercel Edge API routes (`api/ai-mentor.ts`, `api/ai-roadmap.ts`, `api/ai-final-assessment.ts`, `api/ai-course-generator.ts`, `api/ai-module-generator.ts`, and `api/models.ts`) using a shared JWT verification helper (`api/_shared/auth.ts`) that verifies the user's Supabase access token.
- **Client-Side API Key Cleanup:** Stripped hardcoded client-side fallbacks in `src/components/chat/AIMentorChat.tsx` that referenced `import.meta.env.VITE_GEMINI_API_KEY` directly from the browser, securing all LLM queries behind the backend edge API routes.
- **Stored XSS Prevention:** Created a lightweight HTML sanitization helper (`src/lib/sanitize.ts`) and wrapped HTML outputs in `src/pages/student/CoursePlayerPage.tsx` where raw content was rendered via `dangerouslySetInnerHTML`.
- **SSRF Mitigation:** Added IP-based Server-Side Request Forgery (SSRF) checks (`api/_shared/ssrf.ts`) in course and module generator routes to prevent arbitrary outbound requests targeting internal resources, private subnets, loopbacks, and cloud provider metadata services (such as AWS/GCP IMDS).
- **Environment & Dependency Cleanup:** Removed development scripts containing hardcoded credentials (`test.mjs`), untracked theme files, and configured environment variables (`process.env.PISTON_URL` in `vite.config.ts`) instead of hardcoded IP addresses.

### 6. Course Formatting & Assessment-Based Certification
- **Structured Content Schema**: Created database migration (`20260625110000_enrich_course_modules_and_fix_certificates.sql`) to expand the `course_modules` table with columns for `examples`, `real_world_use_cases`, `key_concepts`, and `summary`.
- **Admin Scraping Upgrades**: Refactored course generation in `AdminCoursesPage.tsx` to extract and populate these new structured fields directly into Supabase.
- **Premium Course display**: Integrated structured tabs and card panels in `CoursePlayerPage.tsx` to display concepts, real-world scenarios, and code walkthroughs beautifully.
- **Verification Gates**: Removed the automatic certificate generation trigger and client-side auto-award logic. Added check for coding questions. Established final assessments (MCQ & Coding) as required gates for certificates.

### 7. Supabase RLS Hardening & TypeScript Safety Enforcement
- **Database Row-Level Security (RLS) Hardening**: Dropped the loose, public insert policy `certs_insert_service` (which had `WITH CHECK (true)`) on `certificates`. Added `certs_insert_own` ensuring students can only insert certificates corresponding to their authenticated UID (`auth.uid()::text = user_id::text`), and restricted wildcard inserts with an admin-only `admins_insert_all` policy. Added `admins_view_attempts` on the `assessment_attempts` table so that admin roles can properly monitor student attempts.
- **TypeScript Safety Enforcement**: Refactored the `user` and `debug` state and function signatures in `AuthContext.tsx` to use strict types (`User` from Supabase and custom `Profile` interfaces) instead of `any`. Unified the local duplicate `interface Certificate` in `CertificatePage.tsx` with the globally defined `DBCertificate` interface in `types.ts`. Replaced multiple occurrences of generic `any` mapping objects in `AdminCoursesPage.tsx`, `AdminRoadmapsPage.tsx`, and `CoursePlayerPage.tsx`. Explicitly typed `constraints: string[]` in `DBCodingQuestion` and other properties in `types.ts`. Cleaned up page state assertions and casted dynamic Supabase join returns using structured objects rather than `any` in `AIMentorChat.tsx`, `CodingAssessmentPage.tsx`, and `ProfilePage.tsx`.

### 8. Navigation & Tab Switching State Persistence
- **Auth Listener Guard**: Secured the Supabase `onAuthStateChange` listener in `AuthContext.tsx` by referencing mutable `useRef` tokens, ensuring background session verification events do not set `loading` to `true` when the active user profile is already loaded. This resolves page flashes and component unmounting on tab focus.
- **Input & Editor Drafts**: Implemented `localStorage` state persistence inside `AIMentorChat.tsx` (prompt drafts), `CodingPracticePage.tsx` (user code solutions), and `CodingAssessmentPage.tsx` (exam code solutions) to retain typed content when navigating between views.
- **Anchor Tag Refactoring**: Replaced internal `<a>` tags with `react-router-dom` `<Link>` components in `PricingPage.tsx` and `PaymentHistoryPage.tsx` to prevent full browser reloads.

### 9. Brand Logo Assets & Google OAuth Login Race Condition Fix
- **Unified Logo Assets**: Replaced legacy placeholder bar-chart vectors with the official book-loom monogram logo vectors (`logo-icon.svg`, `logo-dark.svg`, and `auth-logo.svg`). Integrated these assets directly into `AppLayout.tsx`, `TopAppBar.tsx`, `LoginPage.tsx`, and `SignupPage.tsx`.
- **OAuth Callback Guard**: Patched a race condition in `AuthCallbackPage.tsx` that previously caused successful Google logins to immediately redirect to `/login` due to temporary `null` sessions during token exchanges.

### 10. Brand Rebranding, Emoji Clean-up & Google Login Resilience
- **Transparent PNG Brand Logo**: Isolated the LL book monogram logo from its white background to produce clean transparent PNGs (`logo-icon.png` and `logo-icon-light.png`). Integrated them across headers, sidebars, and authentication layouts, replacing previous vector filter hacks.
- **Emoji Removal**: Cleaned up all text emojis from toast notifications, alerts, and UI headers across 11 files (e.g., student dashboards, player pages, and coding editors) to align the platform with premium SaaS aesthetic standards.
- **Google OAuth Resilience**: Implemented a 5-step polling retry mechanism in the profile fetching function (`getProfile`) in `AuthContext.tsx` to handle database profile trigger latency. Added a 10-second safety timeout in `AuthCallbackPage.tsx` to prevent infinite loader hangs.
- **Student Dashboard Aesthetics**: Fixed broken roadmap navigation links (pointing to `/student/roadmap`), redesigned the welcome banner to use modern gradients, styled overall progress indicators with subtle glows, and added interactive card hover translations.

### 11. Complete Mobile Responsiveness & Premium Layout Audit (Phases 1-15)
- **Tailwind Breakpoints**: Added an `xs: '480px'` breakpoint to `tailwind.config.js` to handle compact mobile screen widths (e.g. iPhone SE) elegantly without layout overlapping.
- **Global CSS Utility Classes**: Integrated safe area offsets (`.safe-bottom`), momentum scrolling (`.touch-scroll`), and scrollbar-hiding (`.scrollbar-hide`) utilities in `index.css`.
- **Student Views Refactoring**:
  - *Dashboard & Catalogs*: Styled bento grids, charts, and list items to wrap. Created snap horizontal scrolling for course categories.
  - *Course Player*: Implemented a slide-out modular sidebar drawer (`Sheet` component) on screens smaller than desktop (`lg`) to hold curriculum modules.
  - *Coding Playground*: Stacked the code editor and problem panels vertically on mobile viewports and implemented a tabbed view (Problem, Code Editor, Console Output) with scaled editor font sizes.
- **Touch-Target Compliance**: Adjusted heights of all interactive elements, selection inputs, and navigation buttons to at least `44px` (or `h-11`) to prevent missed taps.
- **Admin Panel Accessibility**:
  - *Hover Overlay Fixes*: Refactored desktop hover-only overlays (`opacity-0 group-hover:opacity-100` action menus) in `AdminCoursesPage`, `AdminCertificatesPage`, `AdminCommunityPage`, `AdminGrandTestPage`, `AdminRoadmapsPage`, and `AdminStudentsPage` to render as visible footers/rows on touch screen devices, ensuring admin functionality is fully mobile-accessible.
  - *Moderation Queue Integration*: Wrapped the bare `AdminDraftCoursesPage` in the global `AppLayout` structure and optimized search filters to stack.
  - *Organization Actions*: Set active Approve/Reject action buttons to `h-11` heights in `AdminOrganizationsPage`.

### 12. Premium Auth Pages & Robust Verification (Phase 12)
- **Removed GitHub Auth**: Completely removed all code, buttons, and state variables for GitHub login and signup.
- **Google OAuth Prominence**: Redesigned `LoginPage` and `SignupPage` to promote Google OAuth to a prominent, full-width button utilizing clean inline SVGs.
- **World-Class UI Redesign**: Redesigned both pages with animated mesh gradients, decorative rotating SVG patterns, and card-based glassmorphism panels for a premium feel.
- **Verification Enhancements**: Embedded an animated verification success state, trust signals (SSL 256-bit badges), and interactive password strength meters showing clear labels and visual cues.
- **RouteGuard & UX Hardening**: Cleaned up internal loading state leaks by removing debug JSON objects from the loading UI. Boosted dark mode text contrast (lightness increased to 62%) for WCAG AA compliance.

### 13. Rich LinkedIn-Inspired Community Hub & Course Player Q&A
- **"Start a Post" Composer Bar**: Designed a top-level composer card displaying the logged-in user avatar and a rounded prompt input bar. Quick-launch shortcuts below ("Ask Doubt", "Share Code", "Group Work") open the post creator with the correct category preselected.
- **LinkedIn-Style Composer Modal**: When initiating a post, a responsive popup modal overlay appears with backdrop-blur. The modal includes user details, a category selection pill, title input, WYSIWYG markdown toolbar, writing area, and a live preview tab.
- **Content Truncation ("...see more")**: Long posts are truncated at 280 characters to keep the feed clean, stripping raw markdown codes for a legible plain-text preview. Clicking **"...see more"** expands the card to display full, rich-text markdown-rendered content.
- **Author Taglines & Bios**: Posts render with user full name, profile bio/headline (queried from `profiles.bio`), and public globe indicators next to the timestamp.
- **Interactive Action Bar**: Standardized horizontal action triggers (Like, Comment, Share) with responsive states. Likes toggle blue highlight states immediately, and comments toggle clean inline commentary streams.
- **Markdown Rendering Engine**: Created a secure [markdown.tsx](file:///d:/Yogesh/Coding/learnloom-main/src/lib/markdown.tsx) module to parse headings, links, bold/italic text, lists, and formatted code blocks (with custom language labels).
- **Accepted Solutions & XP Rewards**: Added the `is_accepted` column to `forum_replies` via a SQL migration ([00033_accepted_solutions.sql](file:///d:/Yogesh/Coding/learnloom-main/supabase/migrations/00033_accepted_solutions.sql)). Toggling an accepted solution automatically awards/deducts `+25 credits` to the solver, syncing with the overall XP Leaderboard.
- **Loomie AI Mentions**: Posts or comments mentioning `@loomie` trigger a backend Gemini API edge call that compiles the thread context, streams the output, and inserts a custom AI reply.
- **Lesson-Linked Discussions**: Replaced the static placeholder tab in [CoursePlayerPage.tsx](file:///d:/Yogesh/Coding/learnloom-main/src/pages/student/CoursePlayerPage.tsx) with a working Q&A discussion board that automatically links questions to the active module.

### 14. Course Seeding Pipeline & Premium Catalog UI
- **Service Role Key Seeding Integration**: Updated [seed-courses.mjs](file:///d:/Yogesh/Coding/learnloom-main/seed-courses.mjs) to parse `SUPABASE_SERVICE_ROLE_KEY` from the environment. Using the service role key enables database inserts to bypass Supabase RLS security policies directly, avoiding the need for hardcoded user authentication credentials. Falls back gracefully to admin email/password login if the service role key is not configured.
- **Cisco-Style Continuous Learning Flow**: Configured the script to generate and link a project lab assignment to **every single module** (20 assignments per course, 80 total). Seeded courses are saved as `is_published: false` (Draft) by default so admin can review contents before listing.
- **Database Clean-Wipe & Queue Status**: Configured the seeding script to clear out any old courses and sub-resources (modules, quizzes, assignments) at the start of execution, leaving only the 4 core courses. Set `status: 'pending_review'` explicitly to ensure they appear in the Admin Moderation Queue for quick approval.
- **Premium Course Catalog UI**:
  - *Dynamic Progress Indicators*: Enrolled students now see a micro-progress bar indicating their exact module completion rate on catalog cards.
  - *Curated Mesh Gradients*: Thumbnails render using premium dark/vibrant gradients (mesh look) with smooth scaling triggers on hover.
  - *Badge Design & Safety Gates*: Added floating labels for difficulty level (Beginner/Intermediate/Advanced) and verified checks for completed courses. Added string splitting fallback logic to prevent app crashes when instructor profiles contain empty values.

### 15. Compilation & Type Integrity Certification
- **TypeScript Error Resolution**:
  - Defined the missing `DBActivityLog` model interface inside `types.ts` to type-safety restrict activity logs.
  - Fixed compiler inferring `never[]` arrays by explicit typing inside `roadmapGenerator.ts`.
  - Added `AIQuizQuestion` and `AICodingTestCase` interfaces in `AdminCoursesPage.tsx`.
  - Added the missing `customInput` state in `CodingAssessmentPage.tsx`.
  - Removed unsupported `noPadding` properties from `AppLayout` wrapper inside `CourseDetailPage.tsx`.
  - Typed JSX Element icons as `React.ReactNode` inside `QuizPage.tsx` and `GrandTestPage.tsx` to prevent implicit `null` assignment errors.
- **Course Player Fixes**:
  - Imported the missing `Skeleton` component for loading states.
  - Changed occurrences of `video_url` (which doesn't exist on the DB schema) to the official `youtube_url` column, safely wrapped with type coalescing.
  - Formatted array fields (`key_concepts`, `real_world_use_cases`, `examples`) into formatted bullet-point markdown strings before rendering them.
- **Zero Errors verification**: Executed `npm run lint` which successfully checked the 134 codebase files, returning exit code `0` (zero compilation warnings or errors!). Verified production build compile succeeds.

## Issues Faced & Resolutions

### Issue 1: Authentication Profile & UUID Mismatches
**Problem:** During the transition from Clerk to Supabase, there was a mismatch between Clerk's generated user IDs and Supabase's native UUID structure, causing issues with the `profiles` table.
**Resolution:** 
1. Implemented a Supabase Edge Function (`clerk-webhook`) to properly sync external profiles.
2. Created a database migration (`00025_add_clerk_id_to_profiles.sql`) to safely map legacy Clerk IDs to the new Supabase UUIDs.

### Issue 2: Code Execution Environment Connectivity
**Problem:** The frontend was struggling to securely and consistently hit the self-hosted Piston environment, particularly in deployed contexts (like Vercel).
**Resolution:** Modified `vercel.json` and added a Vite proxy to securely proxy API requests to the Piston environment.

### Issue 3: UI Layout & Theme Inconsistencies during Redesign
**Problem:** The introduction of the new design system caused clashes with existing Tailwind utility classes, leading to inconsistent backgrounds (dark mode artifacts on light mode) and misaligned layouts on responsive screens.
**Resolution:** 
1. Consolidated all Tailwind color variables into a unified CSS variables structure within `index.css`.
2. Explicitly forced the `light` theme to ensure consistency across the design templates.
3. Used robust `container-queries` and structured padding/margins (e.g., `stack-lg`, `margin-desktop`) from the new design blueprints.
4. Added custom CSS utility classes like `.glass-panel` to abstract complex `backdrop-filter` logic.

### Issue 4: Public, Unauthenticated LLM Endpoints
**Problem:** Edge API routes under `api/` were completely open, allowing unauthorized users to make requests directly to Gemini models, risking rapid token consumption and abuse.
**Resolution:** Implemented a shared authorization middleware (`api/_shared/auth.ts`) using the standard `Bearer` Supabase JWT format, verifying users against Supabase's auth signature before processing AI generation requests.

### Issue 5: Client-Side API Key Exposure Risk
**Problem:** The frontend `AIMentorChat.tsx` was configured with a fallback to call the Gemini API directly from the client side if the Vercel edge endpoint was not configured, introducing a major risk of exposing the API key in client-side production bundles.
**Resolution:** Eliminated the client-side API call fallback entirely, forcing all chat traffic to route through the secure proxy server endpoint.

### Issue 6: Server-Side Request Forgery (SSRF) Vulnerability in AI Generators
**Problem:** The AI course and module generator routes allowed fetching any arbitrary URL passed by users to ingest course material, which could be abused to scan internal resources or target cloud metadata services (e.g., AWS/GCP IMDS).
**Resolution:** Designed a robust SSRF validation helper (`api/_shared/ssrf.ts`) that resolves URLs, checks the target IP address against RFC private, link-local, loopback, and broadcast ranges, and blocks requests to unauthorized destinations.

### Issue 7: Automatic Certificate Generation Without Evaluation Gate
**Problem:** A legacy trigger and in-code routine automatically awarded 100%-graded certificates as soon as a user checked off their last module, rendering final assessments completely redundant.
**Resolution:** 
1. Dropped the auto-award completion trigger `trg_course_completion_certificate` and removed direct certificate insertion on progress completion.
2. Configured a strict validation gate inside `checkAndAwardCertificate` that verifies passing attempts for both the Final MCQ Assessment and the Final Coding Assessment (if the course has coding questions) before issuing a verified certificate.

### Issue 8: Vulnerable Certificate Insertion Policy (certs_insert_service)
**Problem:** The previous `certificates` insert policy `certs_insert_service` was checking `true` and allowing anyone to insert certificates for arbitrary users with arbitrary scores, presenting a major vulnerability in verification legitimacy.
**Resolution:** Created a database migration (`20260625120000_harden_rls_policies.sql`) to drop `certs_insert_service` and enforce a new `certs_insert_own` check requiring `auth.uid()::text = user_id::text` along with an admin-only fallback.

### Issue 9: Compiler Gaps and Loose 'any' Types in Auth Context and Page Components
**Problem:** The codebase contained generic `any` overrides and duplicate local types (like local `Certificate` interfaces), which hid type mismatches and bypassed strict TypeScript compilation checks.
**Resolution:** Explicitly typed user context states and parameters, imported the global database schemas from `types.ts`, and casted Supabase joined query payloads to structured types, leading to a clean, error-free production build.

### Issue 10: App Reload and State Reset on Tab Focus / Background Auth Events
**Problem:** Switching back to the LearnLoom browser tab triggered Supabase auto-refresh checks. The `onAuthStateChange` listener in `AuthContext.tsx` responded to background token verification events by setting the global `loading` state to `true`, which forced `RouteGuard` to render the full-screen loader. This unmounted the entire application and destroyed all user input drafts, written code, and chat histories.
**Resolution:** Used `useRef` to track user and profile states inside `AuthContext.tsx`. Background auth checks now bypass setting `setLoading(true)` if the authenticated user has not changed and their profile is loaded. Combined this with `localStorage` draft saving for chat message inputs and code playgrounds.

### Issue 11: Google OAuth Redirect Race Condition Returning User to Login
**Problem:** Upon redirection from Google OAuth back to `/auth/callback?code=xxxx`, the Supabase auth client processes the code exchange in the background. React Router initially mounted the page with `loading = false` and `user = null`, which caused `AuthCallbackPage.tsx` to immediately redirect to `/login` before the background exchange could complete and sign the user in.
**Resolution:** Modified `AuthCallbackPage.tsx` to inspect URL parameters for OAuth indicators (`code` or `access_token`). Redirection to `/login` is now bypassed while these parameters are active, keeping the loader screen open until the session is successfully established. Admins are then routed directly to `/admin`, and students to `/dashboard`.

### Issue 12: Google OAuth Signup Profile Fetch Latency
**Problem:** Newly registered Google OAuth users had their profiles created asynchronously by a database trigger. The frontend auth listener immediately ran `getProfile` upon sign-in, returning `null` before the database trigger completed.
**Resolution:** Updated `getProfile` inside `AuthContext.tsx` to poll for the user profile row up to 5 times (every 500ms), making the OAuth signup flow extremely robust.

### Issue 13: Google OAuth Callback Infinite Loader
**Problem:** If the Supabase session exchange failed or timed out during OAuth callback, the page remained stuck on the loading spinner indefinitely.
**Resolution:** Added a 10-second safety timeout on `AuthCallbackPage.tsx` that triggers a toast error and redirects the user back to `/login`.

### Issue 14: 404 Route Errors on Dashboard Roadmap Links
**Problem:** The Active AI Roadmap widget in the student dashboard linked to `/student/roadmap`, which did not exist in the routing table.
**Resolution:** Corrected links to point to the active `/ai-roadmap` path.

### Issue 15: Touch Target Gaps and Hidden Actions on Touch Devices
**Problem:** Several components (e.g., admin action controls, course management overlays, and remove-module/remove-question buttons) relied on CSS hover states (`group-hover:opacity-100`), which are inaccessible on touch-only mobile devices, completely locking mobile admins out of management operations.
**Resolution:** Replaced absolute hover-only overlays with responsive flows: displaying actions in-line or as a card footer on mobile screens, and transitioning to a hover overlay only on desktop (`md:` and up) environments.

### Issue 16: E2E Automation Script Failures
**Problem:** Revamping the user signup form removed the confirm password input field (`#confirm`), which caused the automated Puppeteer E2E tests (`test_e2e.cjs`) to fail during form submission checks.
**Resolution:** Modified `test_e2e.cjs` to remove the `#confirm` input field action steps and added support for a customizable `TEST_URL` environment variable to support local testing configurations.

### Issue 17: TypeScript Compiler Type and Symbol Maps Mismatch
**Problem:** Strict type checking (`npm run lint`) flagged compile-time errors in `CoursePlayerPage.tsx`, `GrandTestPage.tsx`, `QuizPage.tsx`, and `CodingAssessmentPage.tsx` due to missing imports (`Skeleton`), deprecated fields (`video_url`), and implicit `null` typing on React elements.
**Resolution:**
1. Imported the missing `Skeleton` component.
2. Switched rendering parameters to target the correct database key (`youtube_url`) and coalesced values to `undefined` for iframe sources.
3. Wrote `formatMarkdownContent` to map array types (`key_concepts`, etc.) to bullet list strings before rendering markdown.
4. Declared test results icons as `React.ReactNode` to prevent compile-time types evaluation errors.

### Issue 18: PostgREST Schema Cache Mismatches on Custom Column Inserts
**Problem:** Attempting to seed modules with the `content` column threw a `Could not find the 'content' column of 'course_modules' in the schema cache` database exception, due to the remote Supabase schema caching missing the progression column updates.
**Resolution:** Updated database setup document references to execute structural migrations (adding progression columns if missing) and invoke the cache notifier command: `NOTIFY pgrst, 'reload schema'`.

## Reference File & Folder Structure

```text
learnloom-main/
├── api/                  # Vercel Edge API endpoints
│   ├── _shared/          # Shared Vercel Edge API helpers (Auth, SSRF protection)
│   ├── ai-*.ts           # AI roadmaps, assessments, and course builders
│   └── models.ts         # Edge LLM configuration utility
├── src/
│   ├── components/
│   │   ├── common/       # Reusable UI elements (Buttons, Inputs, RouteGuards)
│   │   ├── layouts/      # App layout wrappers (Sidebar, TopNav)
│   │   └── landing/      # Extracted Landing Page sections (Hero, Pricing, etc.)
│   ├── contexts/         # React Context providers (AuthContext.tsx)
│   ├── lib/              # Utility functions and helper libraries (sanitize.ts)
│   ├── pages/
│   │   ├── admin/        # All Enterprise Admin dashboard views
│   │   ├── auth/         # Login, Signup, and OAuth Callback pages
│   │   └── student/      # End-user views (Curriculum, AI Tools, Profile)
│   ├── types/            # TypeScript interfaces for DB schemas
│   ├── index.css         # Tailwind directives and core theme variables
│   └── routes.tsx        # Application routing logic
├── supabase/
│   ├── functions/        # Supabase Edge Functions (e.g., clerk-webhook)
│   └── migrations/       # Sequential SQL definitions for DB schema
├── package.json          # Node dependencies and build scripts
└── vercel.json           # Vercel deployment and routing configs
```
