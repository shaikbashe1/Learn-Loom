# Changelog - Quovexi Platform

All notable changes, fixes, and improvements applied to the codebase are documented here.

---

## [1.4.0] - 2026-06-07 — Database Schema & Feature Upgrades (Audit 0.9.0)

### New Features & Database Schema Upgrades
1. **Auto-Issue Certificate on Grand Test Pass (Migration `00020`)**:
   - Implemented a trigger `trg_grand_test_certificate` on `grand_test_attempts` to automatically issue certificates, award 100 credits, and create in-app notifications upon passing the Grand Test.
   - Dropped the `NOT NULL` constraint on `certificates.course_id` to allow course-independent global certificates.
2. **Grand Test Cooldown Enforcement (Migration `00021`)**:
   - Added a 1-hour database cooldown check trigger on `grand_test_attempts` to prevent spamming submissions.
3. **Course Ratings & Reviews System (Migration `00022`)**:
   - Added the `course_ratings` table for 1–5 star ratings and reviews, with RLS policies and a trigger to synchronize rolling average ratings to `courses.rating`.
4. **Video timestamp-based notes (Migration `00023`)**:
   - Added the `video_notes` table for students to save time-specific notes.

### Bug Fixes
5. **Leaderboard Student Filter (Migration `00019`)**:
   - Updated `leaderboard_view` to query `WHERE role = 'student'` to prevent admin/instructor accounts from polluting student rankings.
6. **Frontend Module Sort Order Unification**:
   - Replaced all legacy `sort_order` references with `order_index` when querying or inserting `course_modules` in frontend utilities (`progress.ts`, `AdminCoursesPage.tsx`, `CourseDetailPage.tsx`, `CoursePlayerPage.tsx`).
7. **Grand Test Cooldown UI**:
   - Implemented state checking in `GrandTestPage.tsx` to verify if a 1-hour cooldown is active on mount. Disables start button and shows a ticking cooldown clock (MM:SS) along with an alert.
8. **Composite Rate Limit Indexes (Migration `00019`)**:
   - Added composite indexes on `auth_rate_limit(user_id, endpoint)` to prevent full-table scans under load.

---

## [1.3.0] - 2026-06-07 — Deep Audit & Production Hardening

### Critical Bug Fixes

1. **Course Player: Broken navigation routes** (`CourseDetailPage.tsx`)
   - **Bug**: `navigate('/courses/${id}/learn')` was missing the required `:moduleId` segment — navigated to a non-existent route and hit the catch-all redirect to `/`.
   - **Fix**: Both navigation calls now resolve the correct module ID (`last_module_id` → first unlocked → first module) and navigate to `/courses/${id}/learn/${moduleId}`.

2. **Course Player: Legacy vs new schema video URLs** (`CoursePlayerPage.tsx`)
   - **Bug**: Video player only checked `youtube_url` (legacy column). New modules store the URL in `content_url`. Video never played for new modules.
   - **Fix**: Player now checks `content_url` first, falls back to `youtube_url`. Same for notes download button.

3. **Course Player: Invisible module title** (`CoursePlayerPage.tsx`)
   - **Bug**: Module title `<h2>` used `text-secondary` which renders as near-invisible dark text on dark background in dark mode.
   - **Fix**: Changed to `text-foreground`.

4. **Auth Pages: Invisible headings in dark mode** (`EmailVerificationPage.tsx`, `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx`)
   - **Bug**: Page headings and logo text used `text-secondary` — renders as very dark navy on dark background.
   - **Fix**: Headings changed to `text-foreground`, logo text to `gradient-text`.

### Security Fixes

5. **admin_stats view exposed to all authenticated users** (migration `00017`)
   - **Bug**: `GRANT SELECT ON admin_stats TO authenticated` allowed any student to query aggregate platform stats directly.
   - **Fix**: Revoked broad grant, created `get_admin_stats()` SECURITY DEFINER RPC that enforces `is_admin()` check. Both admin pages updated to use the RPC.

6. **admin_stats view missing columns** (migration `00017`)
   - **Bug**: `AdminReportsPage` referenced `completed_enrollments`, `total_quiz_attempts`, `total_submissions`, `forum_posts_count` — none existed in the view, causing `undefined` values in all report calculations.
   - **Fix**: Extended `admin_stats` view and `get_admin_stats()` RPC with all four missing columns.

### Type System Fixes

7. **`DBGrandTestAttempt` type mismatched DB schema** (`types/types.ts`)
   - **Bug**: Type had `started_at` and `completed_at` — DB has `submitted_at` only. Also missing `total` and `course_id`.
   - **Fix**: Type now correctly reflects actual DB schema.

8. **`DBQuizAttempt` type had non-existent `started_at`** (`types/types.ts`)
   - **Bug**: `started_at?` field referenced in type but does not exist in `quiz_attempts` table.
   - **Fix**: Removed spurious field.

9. **`AdminStats` type missing four report fields** (`types/types.ts`)
   - **Fix**: Added `completed_enrollments`, `total_quiz_attempts`, `total_submissions`, `forum_posts_count`.

### Performance Improvements

10. **Added missing database indexes** (migration `00017`)
    - `notifications(user_id, read) WHERE read = false` — unread notification badge queries
    - `payment_orders(user_id, created_at DESC)` — payment history page
    - `forum_posts(category, created_at DESC)` — community page filtered queries
    - `forum_replies(post_id, created_at ASC)` — reply expansion
    - `grand_test_attempts(user_id, submitted_at DESC)` — attempt history

---

## [1.2.0] - 2026-06-07 — Miaoda Platform Removal & Core Fixes

### Critical Bug Fixes

1. **Google OAuth completely broken** (`AuthContext.tsx`)
   - **Bug**: `signInWithGoogle` called `signInWithSSO({ domain: 'miaoda-gg.com' })` — a Miaoda enterprise SAML SSO endpoint. No standard Google Sign In worked at all.
   - **Fix**: Replaced with `signInWithOAuth({ provider: 'google', options: { redirectTo: '/auth/callback' } })`.

2. **ProfileSetupPage saved nothing to database** (`ProfileSetupPage.tsx`)
   - **Bug**: Form submit called `navigate('/dashboard')` without persisting name, bio, or any field to Supabase.
   - **Fix**: Now calls `supabase.from('profiles').update(...)` before navigating. Calls `refreshProfile()` to sync context.

3. **AuthCallbackPage invisible heading** (`AuthCallbackPage.tsx`)
   - **Bug**: "Signing you in…" `<h2>` used `text-secondary` (dark-on-dark in dark mode).
   - **Fix**: Changed to `text-foreground`.

### Dependency & Branding Removal

4. Removed `miaoda-auth-react` and `miaoda-sc-plugin` from `package.json`
5. Removed `miaodaDevPlugin()` from `vite.config.ts`
6. Replaced `vite.config.dev.ts` (contained injected Miaoda CDN scripts, HMR control APIs, Sentry DSN) with clean standard Vite dev config
7. Replaced Chinese rate-limit error strings in edge functions with English
8. Removed Chinese character check in `AIRoadmapPage` error handler

### Infrastructure

9. Created `.env.example` with all 7 required environment variables documented
10. Added `.env` and `.env.local` to `.gitignore`
11. Added Google OAuth setup guide to `README.md`
12. Removed phantom `VITE_APP_ID` from Vercel deployment docs

---

## [1.1.0] - 2026-06-07

### De-branding & Self-Hostability Improvements

1. Decoupled from proprietary API gateways — all AI features use Google Gemini directly
2. Removed all Miaoda/MeDo branding from Edge Functions and static assets
3. Created `README.md` with local setup, migrations, and hosting instructions
4. Created `.env.example` template



### De-branding & Self-Hostability Improvements

1. **Decoupled MeDo API Gateway**
   - **Fix**: Replaced proprietary `appmedo.com` gateways in all Supabase Edge Functions (`ai-mentor`, `ai-roadmap`, `large-language-model`) with direct integrations to the official Google Gemini API (`generativelanguage.googleapis.com`).
   - **Impact**: Bypasses any external MeDo dependencies and allows developers to run all AI features with standard Google Gemini API keys configured directly in their Supabase secrets (`INTEGRATIONS_API_KEY`).

2. **Removed MeDo Branding**
   - **Fix**: Removed all Miaoda/MeDo branding, text references, and gateway URLs across root configurations, static assets, and Edge Functions code. 
   - **Impact**: The application represents clean, unified "Quovexi" branding.

3. **Created Self-Hosting & Setup Setup**
   - **Fix**: Created a detailed `README.md` containing local setup steps, database schema migrations, and hosting deployment instructions (Vercel, Render, Nginx).
   - **Fix**: Created `.env.example` as a template for setting up local project environment secrets.

---

## [1.0.0] - 2026-06-07

### Issues Found & Root Causes

1. **AI Roadmap Page Integration Mismatch**
   - **Root Cause**: `AIRoadmapPage.tsx` was configured to parse the response as a Server-Sent Events (SSE) stream using `eventsource-parser` and sent a request body structure nested under `contents`. However, the backend Supabase Edge Function `ai-roadmap` was deployed as a standard non-streaming HTTP endpoint expecting `{ domain, level, goals }` and returning a clean JSON object structure (with `phases` and `quiz_questions` instead of `weeks`).
   - **Impact**: The AI Roadmap feature failed to parse responses, throwing `No JSON in response` and resulting in an empty or broken screen for students.

2. **Course Module Schema Type Conflicts**
   - **Root Cause**: Database migrations (Migration 16) added `type`, `order_index`, and `is_free_preview` to the `course_modules` table but did *not* include a `content_url` column, keeping `youtube_url` and `notes_url`. However, `types/types.ts` defined `content_url` and `order_index` as canonical fields, which caused type checking failures in `src/lib/progress.ts` and `src/pages/admin/AdminCoursesPage.tsx` due to missing properties on mapping operations.
   - **Impact**: TypeScript compile-time errors blocked frontend build validation.

3. **Dead / Unused Code**
   - **Root Cause**: `src/pages/SamplePage.tsx` existed in the codebase but was not registered in `src/routes.tsx` or imported/referenced anywhere else.
   - **Impact**: Extra project clutter and unused code.

---

### Fixes Applied

1. **AI Roadmap Mismatch Fix**
   - Rewrote `src/pages/student/AIRoadmapPage.tsx` to call the `ai-roadmap` endpoint as a standard non-streaming `POST` request.
   - Passed the payload matching the edge function's expected signature: `{ domain: selectedDomain, level: 'Beginner', goals: '...' }`.
   - Updated typescript definitions to match the actual API response structure (phases, milestone, topics, quiz questions).
   - Upgraded the UI to elegantly display a phase timeline card-by-card and implemented a fully interactive practice quiz for the generated placement questions.

2. **TypeScript Column Mappings Fix**
   - Modified `src/lib/progress.ts` to map columns accurately without causing missing property errors.
   - Modified `src/pages/admin/AdminCoursesPage.tsx` to use the correct `is_free_preview`, `type`, and `order_index` fields fallback maps when loading and saving course modules, resolving the compiler type mismatch.

3. **Dead Code Cleanup**
   - Deleted `src/pages/SamplePage.tsx` from the workspace.

---

### Files Modified

- [x] [types.ts](file:///c:/Users/dell/Downloads/Quovexi-source/src/types/types.ts) — Verified definitions
- [x] [progress.ts](file:///c:/Users/dell/Downloads/Quovexi-source/src/lib/progress.ts) — Fixed column enrichment types
- [x] [AdminCoursesPage.tsx](file:///c:/Users/dell/Downloads/Quovexi-source/src/pages/admin/AdminCoursesPage.tsx) — Fixed module mapping logic
- [x] [AIRoadmapPage.tsx](file:///c:/Users/dell/Downloads/Quovexi-source/src/pages/student/AIRoadmapPage.tsx) — Restructured roadmap request/response & added interactive practice quiz
- [x] [SamplePage.tsx](file:///c:/Users/dell/Downloads/Quovexi-source/src/pages/SamplePage.tsx) — Deleted unused file
- [x] [ai-mentor/index.ts](file:///c:/Users/dell/Downloads/Quovexi-source/supabase/functions/ai-mentor/index.ts) — Switched to direct Google Gemini API calls
- [x] [ai-roadmap/index.ts](file:///c:/Users/dell/Downloads/Quovexi-source/supabase/functions/ai-roadmap/index.ts) — Switched to direct Google Gemini API calls
- [x] [large-language-model/index.ts](file:///c:/Users/dell/Downloads/Quovexi-source/supabase/functions/large-language-model/index.ts) — Switched to direct Google Gemini API calls
- [x] [README.md](file:///c:/Users/dell/Downloads/Quovexi-source/README.md) — Updated to document self-hosting and setup
- [x] [.env.example](file:///c:/Users/dell/Downloads/Quovexi-source/.env.example) — Created template configuration file

---

### Remaining Blockers

- **None**. The codebase builds, runs, compiles, and type-checks successfully.
