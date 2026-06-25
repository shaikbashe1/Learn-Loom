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
