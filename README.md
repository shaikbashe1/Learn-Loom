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
- **UI System**: Premium Glassmorphism Design System (custom dark/light mode integration)
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

