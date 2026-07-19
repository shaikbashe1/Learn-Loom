# Quovexi — Remaining Issues Report
**Date:** 2026-06-07

This document covers items that cannot be resolved by code changes and require operator action, plus known limitations that are non-blocking for production.

---

## Blockers (Requires Operator Action)

### BLOCK-001 — Google OAuth credentials not configured
**Impact:** "Continue with Google" button fails at runtime  
**Root cause:** Google OAuth requires Client ID and Secret configured in Supabase dashboard  
**Fix steps:**
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create project → APIs & Services → Credentials → Create OAuth 2.0 Client ID
3. Application type: Web application
4. Authorized redirect URIs: `https://<your-project-ref>.supabase.co/auth/v1/callback`
5. Supabase Dashboard → Authentication → Providers → Google → Enable → paste Client ID + Secret

### BLOCK-002 — AI features non-functional without Gemini key
**Impact:** AI Mentor chat and AI Roadmap generation return 500 errors  
**Fix:**
```bash
supabase secrets set INTEGRATIONS_API_KEY=your_gemini_api_key
```
Get key from: [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

### BLOCK-003 — Coding Practice non-functional without Judge0 key
**Impact:** Code submission returns "JUDGE0_API_KEY not configured"  
**Fix:**
```bash
supabase secrets set JUDGE0_API_KEY=your_rapidapi_key
```
Get key from: [rapidapi.com/judge0-official/api/judge0-ce](https://rapidapi.com/judge0-official/api/judge0-ce)

### BLOCK-004 — Payment/subscription features non-functional without Razorpay
**Impact:** Subscribe button fails; payment history empty  
**Fix:**
```bash
supabase secrets set RAZORPAY_KEY_ID=rzp_live_xxx
supabase secrets set RAZORPAY_KEY_SECRET=your_secret
```
Also set `VITE_RAZORPAY_KEY_ID` in frontend env vars (used by checkout.js initialization — check PricingPage).

### BLOCK-005 — Database not initialized
**Impact:** All pages show empty state; no data  
**Fix:** Run all 23 migrations in order:
```bash
supabase db push
```
Or execute files `00001` through `00023` manually in Supabase SQL Editor.

### BLOCK-006 — Edge Functions not deployed
**Impact:** AI features, payments, and code execution 404  
**Fix:**
```bash
supabase functions deploy ai-mentor
supabase functions deploy ai-roadmap
supabase functions deploy large-language-model
supabase functions deploy execute-code
supabase functions deploy judge-code
supabase functions deploy create-razorpay-order
supabase functions deploy verify-razorpay-payment
```

### BLOCK-007 — Storage buckets not created
**Impact:** Avatar uploads and assignment submissions fail  
**Fix:** In Supabase Dashboard → Storage:
1. Create bucket `avatars` (public, no size limit)
2. Create bucket `submissions` (private, 50MB limit)
3. Create bucket `course-assets` (public, for admin course uploads)

---

## Non-Blocking Known Limitations

### LIMIT-001 — No grand test certificate issuance (Resolved)
**Status:** Fixed in migration `00020`. Passed attempts automatically trigger certificate generation.

### LIMIT-002 — Leaderboard shows all users including admins (Resolved)
**Status:** Fixed in migration `00019`. View filtered `WHERE role = 'student'`.

### LIMIT-003 — No email on admin student suspension/ban
**Description:** `AdminStudentsPage` can view student data but has no ban/suspend action.  
**Impact:** Low — moderation limited to certificate revocation.

### LIMIT-004 — Course rating is not user-submitted (Resolved)
**Status:** Fixed in migration `00022`. Added `course_ratings` table, RLS, and rolling average synchronization trigger.

### LIMIT-005 — Forum post moderation is manual
**Description:** Admin dashboard shows recent forum posts in activity feed but there is no admin moderation UI (delete/hide posts).  
**Recommendation:** Add moderation actions to AdminDashboard.

### LIMIT-006 — Grand test has no cooldown (Resolved)
**Status:** Fixed in migration `00021` and frontend. Added 1-hour database cooldown trigger and frontend ticking countdown clock.

### LIMIT-007 — No email notifications
**Description:** The `notifications` table stores in-app notifications only. No email is sent for events like quiz pass, assignment graded, etc.  
**Recommendation:** Use Supabase's built-in SMTP or connect an email provider via Edge Function webhooks.

### LIMIT-008 — SPA routing requires server configuration
**Description:** React Router uses client-side routing. Direct navigation to any non-root URL (e.g. `/dashboard`) will return 404 on vanilla static servers.  
**Required configuration:**
- **Nginx:** `try_files $uri /index.html;`
- **Vercel/Netlify:** Automatic (framework detection)
- **Render:** Set publish directory to `dist`, add rewrite rule

---

## Code Quality Notes (Non-blocking)

- **Unification (Resolved)**: The legacy `sort_order` column on `course_modules` has been dropped (migration `00021`) and all frontend files are unified on `order_index`.
- `enrichModulesWithStatus()` in `progress.ts` creates placeholder module objects with empty strings — this function is defined but not actively used in the final page implementations (each page builds its own enrichment inline). Can be removed or completed.
- The `Badge` and `Certificate` interfaces in `types/types.ts` (lines ~240–265) are legacy frontend-only types duplicating the `DBCertificate` DB type. Can be consolidated.
