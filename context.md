# LearnLoom Premium Redesign — Context & Implementation Summary

This document outlines the accomplishments, issues faced, solutions implemented, and the overall technical approach during the redesign of LearnLoom into a premium, enterprise-grade SaaS platform.

---

## 1. What Has Been Done

### Phase 1: Design System Foundation
*   **Tailwind Configuration**: Cleaned up the color configuration in `tailwind.config.js` to resolve overlapping theme definitions and unified them using HSL CSS variables.
*   **Typography Upgrades**: Remapped `font-label-md` and `font-label-sm` to use `Inter` (sans-serif) instead of `JetBrains Mono` (monospace) to prevent all UI labels from rendering in monospace.
*   **Reusable UI Primitives**:
    *   `loading.tsx`: Unified loading states supporting spinners, skeleton bars, and shimmers.
    *   `empty-state.tsx`: Branded empty state cards with custom Lucide icons.
    *   `status-badge.tsx`: Semantic status badges mapping success, info, warning, error, and neutral statuses to design tokens.
*   **Shared Components**:
    *   `MarkdownToolbar.tsx`: Consolidated the duplicate markdown formatting toolbars from `CoursePlayerPage` and `CommunityPage` into a single selection-aware component using Lucide icons.
    *   `UserAvatar.tsx`: Standardized user avatar displays with fallback initials and online status indicators.

### Phase 2: Navigation & Layout Shell
*   **Collapsible App Sidebar**: Completely redesigned `AppLayout.tsx` to feature a modern, collapsible sidebar (Linear-style) with a clean hierarchy, user profile dropdowns, and responsive mobile bottom navigation.
*   **Command Palette**: Created a `CommandPalette.tsx` component supporting quick navigation triggers via `Cmd+K` or `Ctrl+K`.
*   **Layout Pages**: Redesigned the `NotFound.tsx` (404) page and updated `TopAppBar.tsx` to match the premium theme.

### Phase 3: Core Student Pages Redesign (Completed)
*   **Student Dashboard**: Redesigned `StudentDashboard.tsx` with a personalized time-of-day greeting, active AI Roadmap progress tracker, weekly activity chart, and gamification rank badges.
*   **Course Catalog**: Rebuilt `CourseCatalogPage.tsx` featuring a premium search hero banner, desktop filter sidebar, category scroll view, rating stars, and status badges.
*   **Course Detail Page**: Completely redesigned `CourseDetailPage.tsx` with a premium hero panel, interactive syllabus module list, assignment submissions cards, and a grand test progress widget.
*   **Course Player Page**: Refactored `CoursePlayerPage.tsx` to integrate the shared `MarkdownToolbar` and `UserAvatar`, replacing all Material Symbols with Lucide React icons.
*   **Community Page**: Redesigned `CommunityPage.tsx` to use the shared `MarkdownToolbar` and `UserAvatar` components, and replaced all material symbols with Lucide React icons.
*   **Profile Page**: Completely redesigned `ProfilePage.tsx` with a LinkedIn-style header, profile strength indicator bar, career goals card, and interactive social links.
*   **Leaderboard Page**: Overhauled `LeaderboardPage.tsx` to feature a premium 3D podium layout for top scholars, global rankings table, achievement badges, and a rewards store.
*   **Coding Practice Page**: Redesigned `CodingPracticePage.tsx` with a premium dark coding editor theme, Fira Code typography, selection-aware action bar, tabbed console outputs, and detailed test case verdicts.
*   **Messages Page**: Redesigned `MessagesPage.tsx` featuring a clean inbox view with unread badges, integrated `UserAvatar` profiles, and a high-fidelity active chat window.
*   **AI Roadmap Page**: Overhauled `AIRoadmapPage.tsx` with a dynamic roadmap wizard, vertical stages timeline, XP rewards, and an integrated AI Mentor slide-out drawer.

### Phase 7: NetAcad LMS Content & General UX Polish
*   **NetAcad-Style Original Textbooks**: Upgraded the course seeding engine (`seed-courses.mjs`) to replace basic HTML placeholders with rich, original, Cisco NetAcad-inspired markdown textbooks. Modules now contain structured sections (Overview & Objectives, learning targets, ASCII-art architectural workflows, real-world industry use cases, copy-pasteable production-ready code samples with line-by-line breakdowns, and takeaways). Seeded all 4 flagship courses with this textbook content.
*   **Sign-Out Redirection Guard**: Wrapped the `handleSignOut` handler inside `AppLayout.tsx` in a try-catch-finally block to guarantee immediate client redirection to `/login` even during network/session exceptions.
*   **UX Selection Blocks Resolved**: Removed text selection blocks (`select-none` utility classes) from the layout containers in `CertificatePage.tsx` and `OnboardingPage.tsx`, enabling users to select and copy certificate verification codes and usernames.

### Phase 8: Next.js & NestJS Clean Architecture Workspace
*   **Monorepo Skeleton Layout**: Bootstrapped `/apps/frontend` (Next.js App Router client) and `/apps/backend` (NestJS modular API server) inside the workspace root.
*   **Prisma ORM Configurations**: Defined modern multi-relation model maps in `schema.prisma` locked under `@prisma/client` and `prisma` CLI version `^6.0.0` to preserve connection configurations and enums.
*   **Migrated Functional Modules**:
    *   **Phase 11 (Authentication)**: Complete signup/signin backend handlers with bcrypt hash security, Passport JWT extraction, roles authorization guards, and frontend route protection context providers.
    *   **Phase 12 (Course Module)**: Searchable catalogs, dynamic blueprints syllabus grids, collapsible players, and an interactive bit-shifting Subnet VLSM simulator widget.
    *   **Phase 13 (Quiz Module)**: Timed quiz players, Fisher-Yates randomizations, negative markings grading math, sidebar navigation grids, and scorecard banners.
    *   **Phase 14 (Coding Practice)**: Piston compiler connection engine, stdin parameters input handlers, stdout console recorders, and split-pane Monaco IDE containers.
    *   **Phase 15 (AI Tutor)**: Official Google GenAI SDK client integrations querying Gemini 2.5 Flash models, chatbot slide-out drawer interfaces, and quick prompts cards.
    *   **Phase 16 (Certificates)**: Course progress checks audits, SHA-256 verified hashes, portfolio grids, and public credential lookup screens.
    *   **Phase 17 (Leaderboard)**: Daily consecutive login streak trackers, reward store links, and 3D podium scholar leaderboards.
    *   **Phase 18 (Admin Dashboard)**: Total student enrollment counters, audit logging logs timeline, student suspension switches, and course draft publishes.

### Phase 9: AI Rate Limiting & AI Course Consistency (New)
*   **Daily AI Rate Limiting (Server-Side)**: Integrated atomic, tier-based rate limiting on Edge API endpoints (`api/ai-mentor.ts`, `api/ai-roadmap.ts`, and `api/coding-ai.ts`) using the `check_and_increment_rate_limit` RPC function. Limits are enforced based on plans: Free (5 msgs/day AI Mentor, 3/day Roadmaps, 5/day Coding AI), Pro (100/day Mentor, 20/day Roadmaps, 50/day Coding AI), and Elite (500/day for all).
*   **AI Roadmap Prompt & Validation**: Enhanced the AI generation prompt to request structured objects containing `key_skills`, `estimated_hours`, and `prerequisite_knowledge`. Lowered temperature to `0.3` for consistency and added post-generation structure validation with fallbacks.
*   **Frontend Usage Tracking**: Created `useAIRateLimit` hook to query usage state. Integrated usage count limit indicators, error boundary handling for `429` statuses, and a sidebar usage card/progress bar in `AIMentorPage.tsx`.
*   **Course Seeding Enrichment**: Updated `seed-courses.mjs` to map dynamically generated module content (learning objectives, key takeaways, code walkthrough examples, real-world use cases, key concepts, and summaries) directly to DB columns instead of generic placeholder text, resolving course content inconsistency.

---

## 2. Issues Faced & Solutions

### Issue E: Prisma v7 Schema Datasource URL Dropped
*   **Symptom**: Running `npx prisma generate` failed under Prisma v7 with exit code `1` (code `P1012`) declaring that `url = env("DATABASE_URL")` is no longer supported directly inside `schema.prisma`.
*   **Solution**: Replaced Prisma dependency configurations in the backend `package.json` to lock both CLI and client runtimes to stable version `^6.0.0`, which retains env-driven configurations without breaking changes.

### Issue F: Next.js Monaco Editor Hydration Errors
*   **Symptom**: Mounting the Monaco Editor inside Next.js App Router pages triggered compilation type mismatch checks during pre-rendering stages.
*   **Solution**: Integrated Monaco Editor React with client-side loading options to ensure that code playground containers pre-render static shells and mount safely in browser runtimes.

### Issue A: Tailwind Color & Monospace Label Conflicts
*   **Symptom**: Custom colors had duplicate mappings, and all button/status labels were rendering in monospace.
*   **Solution**: Mapped all custom theme colors to `hsl(var(--...))` variables defined in `index.css` and remapped label font families to Inter.

### Issue B: Duplicate Markdown Toolbars & Hardcoded Formats
*   **Symptom**: The markdown editor toolbars in the course player and the community pages had duplicate code and relied on the legacy Material Symbols icon library.
*   **Solution**: Extracted a unified, selection-aware `MarkdownToolbar` component that handles formatting insertion and uses Lucide icons.

### Issue C: Missing Types and Utility Functions during Redesign
*   **Symptom**: Redesigned pages encountered compilation errors due to missing type definitions (like `DBCourse`, `DBModule`) or missing utilities (like `cn`).
*   **Solution**: Added explicit type imports and imported the `cn` utility from `@/lib/utils` across all redesigned pages.

### Issue D: Duplicate CodingProblem Types & Missing Sandbox Dependencies
*   **Symptom**: Build checks failed because the `DBCodingProblem` interface was declared twice with conflicting property types. Also, Monaco Editor and React Markdown imports caused compilation errors.
*   **Solution**: Separated the legacy type definitions inside `types.ts`. Installed `@monaco-editor/react` and `react-markdown` in `package.json` to support code playgrounds, and added `fullWidth`/`noFooter` properties to `AppLayout` to support wide-pane layouts.

---

## 3. Overall Approach

1.  **Research & Audit**: Analyzed the existing pages, state management, and Supabase hooks before editing to ensure zero functional regression.
2.  **Design Primitives First**: Built clean, reusable UI primitives (avatars, badges, loaders, toolbars) to ensure visual consistency across all pages.
3.  **Incremental Redesign & Seeding**: Redesigned pages file-by-file, maintaining exact functional parity. Seeded the database with high-quality original learning material.
4.  **Continuous Verification**: Ran `npm run lint` and `npm run build` at every step to ensure type safety, clean builds, and zero compilation errors.
