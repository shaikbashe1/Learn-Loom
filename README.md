# LearnLoom Educational Platform

[![React](https://img.shields.io/badge/React-18.x-blue.svg?style=flat-square&logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.x-64748f.svg?style=flat-square&logo=vite)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-green.svg?style=flat-square&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC.svg?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Security](https://img.shields.io/badge/Security-Hardened-success.svg?style=flat-square)](https://github.com/shaikbashe1/Learn-Loom)

LearnLoom is a production-ready, self-hostable EdTech SaaS platform designed to unite structured courses, an AI mentor, a customized learning roadmap generator, interactive coding challenges, leaderboard competition, and verification systems under a single unified dashboard.

Built using **Vite, React 18, TypeScript, and Supabase**.

---

## Technical Stack & Services
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Radix UI (shadcn/ui) + Lucide Icons
- **UI System**: Premium Glassmorphism Design System (custom dark/light mode integration, fully responsive audited down to 320px with strict touch-target compliance)
- **Backend/Database**: Supabase (PostgreSQL with RLS, Auth, Storage, Edge Functions, Realtime)
- **AI Integrations**: Google Gemini 2.5 Flash API (invoked directly from self-hosted Supabase Edge Functions)
- **Code Execution Engine**: Judge0 API / Piston (self-hosted)

---

## Local Setup & Installation

Follow these steps to run the application locally on your machine:

### 1. Prerequisites
Ensure you have Node.js and npm installed:
- Node.js ≥ 20.x
- npm ≥ 10.x

### 2. Clone the Repository & Install Dependencies
```bash
# Clone the repository and navigate into the directory
cd LearnLoom-source

# Install package dependencies
npm install
```

### 3. Configure Local Environment Variables
Create a `.env` file at the project root by copying the template:
```bash
cp .env.example .env
```
Open `.env` and fill in your Supabase connection parameters:
- `VITE_SUPABASE_URL`: Your Supabase Project API URL.
- `VITE_SUPABASE_ANON_KEY`: Your Supabase Project public anonymous key.
- `PISTON_URL` (Optional): Custom URL endpoint for the self-hosted Piston code compiler. Defaults to `http://localhost:2000` in local development.

---

## Database Setup & Supabase Configuration

LearnLoom is designed to be fully self-hostable using your own Supabase project.

### 1. Database Migrations
To set up your Database tables, views, RLS policies, triggers, and RPC functions:
1. Install Supabase CLI locally:
   ```bash
   npm install -g supabase
   ```
2. Link your Supabase CLI to your remote project:
   ```bash
   supabase link --project-ref your-supabase-project-ref
   ```
3. Push all database schema migrations in chronological order (located in `supabase/migrations/`):
   ```bash
   supabase db push
   ```
   *Alternatively*, you can copy the contents of the files in `supabase/migrations/` (from `00001` to `00016`) and execute them directly inside the **SQL Editor** of your Supabase Dashboard.

### 2. Storage Buckets Configuration
Create two storage buckets in your Supabase project:
1. **avatars**: Public bucket for profile avatars.
   - Configure RLS policies: Select is allowed for everyone; insert/update is allowed only for the authenticated owner (`auth.uid() = owner`).
2. **submissions**: Private bucket for assignment submissions (50MB file size limit).
   - Configure RLS policies: Read/write only for the authenticated student owner and admin role.

### 3. Deploy Edge Functions & Set Secrets
Deploy the Deno Edge Functions located in `supabase/functions/`:
```bash
supabase functions deploy ai-mentor
supabase functions deploy ai-roadmap
supabase functions deploy large-language-model
```
Set the Google Gemini API Key in your Supabase Secrets so the deployed Edge Functions can query the Gemini LLM:
```bash
supabase secrets set INTEGRATIONS_API_KEY=your_google_gemini_api_key
```

### 4. Google OAuth Configuration

To enable **Continue with Google** sign-in:

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create a project.
2. Navigate to **APIs & Services → Credentials → Create OAuth 2.0 Client ID** (Web application).
3. Under **Authorized redirect URIs**, add:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
4. Copy the **Client ID** and **Client Secret**.
5. In your Supabase Dashboard, go to **Authentication → Providers → Google**.
6. Enable Google, paste in the Client ID and Secret, and save.


### 5. Seeding Realistic Course & Community Data

To populate your database with 4 production-quality, well-structured courses (Python, Java, AI & ML, and AI Agents) along with community discussions:

1. **Configure Service Role Key**: Add the `SUPABASE_SERVICE_ROLE_KEY` to your `.env` file. This is your project's administrative key that allows bypassing RLS constraints during seeding.
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```
2. **Run Course Seeding**: Runs the curated seeder creating 20 modules per course containing **original, high-fidelity NetAcad-style markdown textbooks** (with target learning objectives, structured theory paragraphs, ASCII-art architectural workflows, step-by-step code walkthroughs with line-by-line breakdowns, industry use cases, and summaries), quizzes, coding labs, final grand tests, and a practical assignment for every module in Draft mode:
   ```bash
   npm run seed
   ```
   > [!IMPORTANT]
   > **Schema Cache Mismatches**: If you see `Could not find the 'content' or 'content_url' column of 'course_modules'` or `Could not find the 'module_id' column of 'assignments'` during seeding, PostgREST needs to reload its cache. Run the following command in the **SQL Editor** of your Supabase Dashboard:
   > ```sql
   > -- Add all missing progression columns to the course_modules table
   > ALTER TABLE public.course_modules 
   > ADD COLUMN IF NOT EXISTS content_url TEXT,
   > ADD COLUMN IF NOT EXISTS learning_objectives TEXT,
   > ADD COLUMN IF NOT EXISTS content TEXT,
   > ADD COLUMN IF NOT EXISTS diagrams JSONB DEFAULT '[]'::jsonb,
   > ADD COLUMN IF NOT EXISTS code_blocks JSONB DEFAULT '[]'::jsonb,
   > ADD COLUMN IF NOT EXISTS reference_links JSONB DEFAULT '[]'::jsonb,
   > ADD COLUMN IF NOT EXISTS key_takeaways JSONB DEFAULT '[]'::jsonb,
   > ADD COLUMN IF NOT EXISTS examples JSONB DEFAULT '[]'::jsonb,
   > ADD COLUMN IF NOT EXISTS real_world_use_cases JSONB DEFAULT '[]'::jsonb,
   > ADD COLUMN IF NOT EXISTS key_concepts JSONB DEFAULT '[]'::jsonb,
   > ADD COLUMN IF NOT EXISTS summary TEXT;
   > 
   > -- Add module_id to assignments table
   > ALTER TABLE public.assignments 
   > ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES public.course_modules(id) ON DELETE CASCADE;
   > 
   > NOTIFY pgrst, 'reload schema';
   > ```
3. **Run Community Seeding**: Populates initial welcome announcements, programming doubts, and community discussions:
   ```bash
   node seed-community.mjs
   ```

---


You can manage the local development lifecycle using standard npm commands:

### Start Development Server
```bash
npm run dev
```
By default, this runs the development server on `http://localhost:5173`.

### Compile & Build Production Bundles
```bash
npm run build
```
This compiles TypeScript and bundles the assets under the `dist/` directory.

### Preview Production Bundles Locally
```bash
npm run preview
```
Runs a local web server serving the static files compiled in `dist/` to preview the production-ready code.

---

## Deployment Guidelines

LearnLoom is a static React application, making it extremely easy and inexpensive to host on any modern static deployment provider.

### Vercel Deployment
1. Connect your GitHub/GitLab repository to Vercel.
2. Select **Vite** or **Other** as the framework preset.
3. Configure the build settings:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add the Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Click **Deploy**.

### Render Deployment
1. Create a new **Static Site** on Render.
2. Connect your repository.
3. Set the following build options:
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Add environment variables under the **Environment** tab.
5. Click **Save** and trigger a deploy.

### Self-Hosted Linux Servers (Nginx / Docker)
To serve the static client using Nginx:
1. Run `npm run build` to output the static build.
2. Copy the files inside the `dist` folder to your server's public html directory (e.g. `/var/www/learnloom`).
3. Set up your Nginx configuration block (`nginx.conf`):
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       root /var/www/learnloom;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }
   }
   ```
4. Restart Nginx: `sudo systemctl restart nginx`.

---

## Course Progression & Certification Validation

LearnLoom utilizes a strict progression and validation architecture to ensure student learning is thoroughly validated before certificates are issued:

### 1. Progression & Formatting
- **Rich Module Formatting**: When modules are scraped or AI-generated, rich fields such as `examples`, `real_world_use_cases`, `key_concepts`, and `summary` are structured in `course_modules` (in JSONB/TEXT format) and displayed in the frontend via interactive panels.
- **Strict Linear Progression**: Students unlock modules sequentially. Progress increments as each module is marked complete.

### 2. Assessment Verification Gate
- Upon reaching **100% course progress**, the course enrollment transitions to an "Assessments Unlocked" state. Course completion (`completed_at`) is **not** set and no certificate is issued at this stage.
- To earn a certificate, students must successfully pass:
  1. **Final MCQ Assessment**: A proctored, proctor-simulated multiple-choice exam (75% passing score required).
  2. **Final Coding Assessment**: If the course includes hands-on programming challenges (contains coding questions), the student must pass the interactive coding exam.
- **Dynamic Requirement Mapping**: The system automatically queries `coding_questions` for the course. If no coding questions are configured, the coding assessment is bypassed, requiring only the MCQ exam.

### 3. Certificate Issuance
- When the student successfully passes all required assessments:
  - An average score is computed and a verified certificate is generated in the `certificates` table.
  - A unique, cryptographically-valid verification number is generated for QR and public code verification.
  - The enrollment record is updated to set `completed_at = NOW()`, officially marking the student as certified.

---

## Security Architecture

LearnLoom is engineered with enterprise-grade security standards to defend against web application vulnerabilities, prevent resource abuse, and safeguard sensitive keys:

### 1. API Route Authorization
All Vercel Edge API routes under `api/` (such as `api/ai-mentor.ts`, `api/ai-roadmap.ts`, etc.) are secured behind a middleware-style JWT validation layer. 
- Client requests must supply a valid Supabase access token in the `Authorization: Bearer <token>` header.
- The backend verifies this token dynamically against the Supabase Auth API before processing any LLM or database requests, preventing unauthenticated access and credit exhaustion.

### 2. Client-Side API Key Safety
We do not expose upstream API keys (e.g., `GEMINI_API_KEY`) to the browser client. All client communication with the Google Gemini API is securely proxied through backend Edge functions and authenticated Vercel Edge routes, completely preventing API key extraction from production JavaScript bundles.

### 3. Server-Side Request Forgery (SSRF) Protection
The AI course and module generator routes that accept user-provided URLs use an advanced SSRF filter:
- Target hosts are resolved to their IP addresses.
- Incoming IPs are verified against RFC-compliant private, loopback, link-local, multicast, and broadcast subnets.
- Any request attempting to access internal endpoints, local servers, or cloud metadata endpoints (e.g., AWS/GCP IMDS at `169.254.169.254`) is immediately blocked.

### 4. Cross-Site Scripting (XSS) Sanitization
HTML generated by LLMs or uploaded by users is run through a lightweight sanitization utility before rendering. Any instances where React is forced to render raw HTML via `dangerouslySetInnerHTML` are wrapped with `sanitizeHtml()` to filter out malicious scripts, `javascript:` URIs, and dangerous iframe/object configurations.

### 5. Database Row-Level Security (RLS) Hardening
Database tables (such as `certificates` and `assessment_attempts`) are strictly protected via explicit PostgreSQL Row-Level Security (RLS) policies. Authenticated students can only read and write their own certificates where `auth.uid()::text = user_id::text`. Wildcard inserts are disabled, and administrative policies ensure that only authorized administrative roles can perform batch actions or audit student assessment attempts.

### 6. Google Login Reliability & Resilient Callbacks
To handle latency in asynchronous database profile creation triggers during OAuth registration, frontend queries are configured to retry with polling intervals (up to 5 times every 500ms). Additionally, a 10-second safety timeout is implemented on the callback routing handler to protect the user from infinite loader hangs during unexpected backend timeouts or network drops.

### 7. Premium Authentication Pages & Secure RouteGuard
The login and signup pages have been completely redesigned with a premium, responsive glassmorphism layout, featuring animated mesh gradients, SSL trust badges, and password strength indicators. GitHub login was removed entirely, promoting Google OAuth to a prominent full-width button. The `RouteGuard` loading state was secured by removing debug JSON objects that leaked internal states to users, replacing it with a clean, branded loader.

---

## Next.js & NestJS Clean Architecture Workspace

LearnLoom features a modern enterprise monorepo setup inside the `/apps` directory:

### 1. Structure
* **Backend (`/apps/backend`)**: NestJS modular application using Prisma ORM. Exports auth guards, course progression APIs, shufflers, auto-graders, Piston execution integrations, Gemini AI tutors, and security audit timelines.
* **Frontend (`/apps/frontend`)**: Next.js App Router client using Tailwind styling, Monaco coding playgrounds, VLSM bit-shifting subnet calculators, and verification portals.

### 2. Local Setup & Startup
Ensure database environment variables are configured in `.env`:
```bash
# Start backend API (runs on http://localhost:4000)
cd apps/backend
npm install
npx prisma generate
npm run start:dev

# Start frontend client (runs on http://localhost:3000)
cd ../frontend
npm install
npm run dev
```

---




