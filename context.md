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

## Reference File & Folder Structure

```text
learnloom-main/
├── src/
│   ├── components/
│   │   ├── common/       # Reusable UI elements (Buttons, Inputs, RouteGuards)
│   │   ├── layouts/      # App layout wrappers (Sidebar, TopNav)
│   │   └── landing/      # Extracted Landing Page sections (Hero, Pricing, etc.)
│   ├── contexts/         # React Context providers (AuthContext.tsx)
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
