# LearnLoom — Security Report
**Date:** 2026-06-07

---

## Critical (Fixed)

### SEC-001 — Google OAuth endpoint pointed at third-party SSO
**File:** `src/contexts/AuthContext.tsx`  
**Severity:** Critical  
**Description:** `signInWithGoogle()` called `supabase.auth.signInWithSSO({ domain: 'miaoda-gg.com' })`. This is an enterprise SAML SSO flow for a different platform entirely. In addition to being non-functional, it sent the user's authentication request to a third-party domain.  
**Fix:** Replaced with `supabase.auth.signInWithOAuth({ provider: 'google' })`.

---

## High (Fixed)

### SEC-002 — admin_stats view world-readable by all authenticated users
**File:** `supabase/migrations/00007_add_forum_certificates_leaderboard_indexes.sql`  
**Severity:** High  
**Description:** `GRANT SELECT ON admin_stats TO authenticated` allowed any logged-in student to query platform-wide aggregate statistics (total students, enrollments, certificates, pass rates).  
**Fix:** Revoked broad grant. Created `get_admin_stats()` SECURITY DEFINER function that enforces `is_admin(auth.uid())` before returning data. Applied in migration `00017`.

---

## Medium (Pre-existing, Mitigated)

### SEC-003 — Supabase Storage submissions bucket
**Status:** Addressed in migration 00008  
**Description:** The `submissions` bucket has correct private RLS:
- Users can only upload to their own subfolder: `assignments/{userId}/...`
- Users can only read from their own subfolder
- Admins can read all submissions
- Bucket is not public

### SEC-004 — Role escalation
**Status:** Addressed in migrations 00008 + 00015  
**Description:** Two-layer protection:
1. `prevent_role_escalation()` trigger on `profiles` table blocks role changes for non-admins
2. `users_update_own` RLS policy uses `WITH CHECK (role IS NOT DISTINCT FROM current_role)` to prevent privilege escalation via direct API calls

### SEC-005 — Payment signature verification
**Status:** Correctly implemented  
**File:** `supabase/functions/verify-razorpay-payment/index.ts`  
**Description:** Uses HMAC-SHA256 with server-side `RAZORPAY_KEY_SECRET` to verify payment signatures. Amount and plan details fetched server-side from DB — never trusted from client payload.

### SEC-006 — API keys exposure
**Status:** Correct  
**Description:**
- `SUPABASE_SERVICE_ROLE_KEY` only in Edge Functions (Deno.env), never in frontend
- `INTEGRATIONS_API_KEY`, `JUDGE0_API_KEY`, `RAZORPAY_KEY_SECRET` same
- Frontend only has `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (both intended to be public)
- No hardcoded secrets found in any source file

### SEC-007 — Row-Level Security coverage
**Status:** Correct — all tables have RLS enabled  
**Tables audited:**
- `profiles` — users see/edit own; admins full access
- `user_course_enrollments` — users manage own; admins read all
- `user_module_progress` — users manage own
- `quiz_attempts` — users manage own; admins read all
- `assignment_submissions` — users manage own; admins read all
- `grand_test_attempts` — users manage own; admins read all
- `certificates` — users read own; admins full access
- `notifications` — users read/update own; admins read all (added 00017)
- `payment_orders` — users read own; service role writes
- `user_subscriptions` — users read own; service role writes
- `forum_posts` / `forum_replies` — read: public; write: authenticated owner
- `coding_problems` — read: authenticated; write: admins only
- `course_ratings` — read: public/authenticated; write: authenticated owner
- `video_notes` — read/write: owner only

---

## Informational

### SEC-008 — CORS headers in Edge Functions
**File:** `supabase/functions/_shared/cors.ts`  
**Status:** Acceptable for Supabase Edge Functions  
**Note:** `Access-Control-Allow-Origin: *` is standard for Supabase functions that validate auth via JWT bearer tokens. The broad CORS does not bypass authentication — every function validates `Authorization: Bearer <token>` via `supabase.auth.getUser()`.

### SEC-009 — YouTube embed sandboxing
**File:** `CoursePlayerPage.tsx`  
**Status:** Correct  
**Description:** YouTube iframes use `sandbox="allow-same-origin allow-scripts allow-popups allow-presentation"` and `referrerPolicy="strict-origin-when-cross-origin"`.

---

## OWASP Top 10 Assessment

| # | Category | Status |
|---|----------|--------|
| A01 | Broken Access Control | ✅ RLS on all tables, role guard on admin routes |
| A02 | Cryptographic Failures | ✅ HMAC-SHA256 for payments, HTTPS enforced by Supabase |
| A03 | Injection | ✅ Supabase client uses parameterized queries |
| A04 | Insecure Design | ✅ Server-side price lookup, no client-trust for amounts |
| A05 | Security Misconfiguration | ✅ Fixed SEC-002; no debug endpoints in production |
| A06 | Vulnerable Components | ✅ 0 known vulnerabilities (npm audit clean) |
| A07 | Identity & Auth Failures | ✅ Fixed SEC-001; JWT-based session; email verification |
| A08 | Software & Data Integrity | ✅ No CDN scripts without SRI (removed in this audit) |
| A09 | Security Logging | ⚠️ No application-level audit log (acceptable for v1) |
| A10 | Server-Side Request Forgery | ✅ Edge functions only call known APIs (Gemini, Razorpay, Judge0) |
