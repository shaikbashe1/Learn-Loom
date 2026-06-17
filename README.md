# LearnLoom Educational Platform

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
