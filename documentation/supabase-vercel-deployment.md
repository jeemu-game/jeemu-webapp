# Hosting Jeemu on Supabase & Vercel — Deployment Guide

This guide walks you through deploying the **Jeemu** web application to **Vercel** (Edge CDN + Serverless Functions) and **Supabase** (Managed PostgreSQL database + Realtime WebSockets).

---

## Architecture Overview

- **Frontend**: Vite SPA built to `dist/`, served globally via Vercel's high-speed Edge CDN.
- **Serverless API**: Handled by `api/index.js` on Vercel Serverless Functions (`/api/subscribers`, `/api/telemetry/event`, `/api/posts`, etc.).
- **Database & Realtime**: Managed PostgreSQL on Supabase storing waitlist subscribers, VIP reservations, click telemetry, and community posts, with Supabase Realtime broadcasting live updates to connected dashboards.

---

## Part 1: Supabase Setup (3 Minutes)

### Step 1: Create a Free Supabase Project
1. Log in to [supabase.com](https://supabase.com) and click **New Project**.
2. Choose your organization, set a project name (e.g., `jeemu-prod`), and generate a secure database password.
3. Select the region closest to your primary audience (e.g., *East US (North Virginia)* or *Singapore*).
4. Click **Create new project** and wait ~60 seconds for provisioning.

### Step 2: Run the SQL Schema
1. In the Supabase left navigation bar, click on **SQL Editor** (icon with `>_`).
2. Click **New Query**.
3. Open [`supabase/schema.sql`](../supabase/schema.sql) in this repository, copy all the code, and paste it into the Supabase SQL editor.
4. Click **Run** (or press `Ctrl + Enter`).
5. You should see `Success. No rows returned`.
6. Click on **Table Editor** in the left menu to verify the 4 created tables:
   - `subscribers` (pre-seeded with initial backers)
   - `telemetry_events` (ready for clicks and dwell times)
   - `posts` (pre-seeded with feed, chaos, and journey posts)
   - `settings` (pre-seeded with Kickstarter early-bird goal)

### Step 3: Copy Your New Publishable & Secret API Keys
1. Open the API Keys settings page:
   👉 **[Supabase Project Settings > API Keys](https://supabase.com/dashboard/project/quhpizadgfhhrdfompnm/settings/api-keys)**
2. In the **Publishable and secret API keys** section:
   - **Project URL**: `https://quhpizadgfhhrdfompnm.supabase.co`
   - **Publishable Key** (starts with `sb_publishable_`): Safe to use in client-side code and browser apps.
   - **Secret Key** (starts with `sb_secret_`): Server-side only (for Vercel serverless functions / Node server). Keep confidential!

---

## Part 2: Local Testing with Supabase (Optional)

If you'd like to test your Supabase cloud connection locally before deploying to Vercel:

1. Open `.env` in your project root.
2. Paste your keys from the dashboard:
   ```ini
   SUPABASE_URL=https://quhpizadgfhhrdfompnm.supabase.co
   SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   SUPABASE_SECRET_KEY=sb_secret_...
   VITE_SUPABASE_URL=https://quhpizadgfhhrdfompnm.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. You should see:
   ```
   ⚡ Connected to Supabase Cloud Database at: https://quhpizadgfhhrdfompnm.supabase.co (using Secret/Service Role Key)
   🚀 JEEMU UNIFIED BACKEND & SUBDOMAIN ROUTER LIVE!
   ```

*(Note: If `.env` keys are empty, Jeemu automatically falls back to `data/jeemu.db.json` local mode).*

---

## Part 3: Deploying to Vercel (3 Minutes)

### Option A: Deploy via Vercel Web Dashboard (Recommended)

1. Push your repository to GitHub, GitLab, or Bitbucket:
   ```bash
   git add .
   git commit -m "feat: configure Supabase & Vercel deployment"
   git push origin main
   ```
2. Go to [vercel.com](https://vercel.com) and click **Add New...** -> **Project**.
3. Import your `jeemu-webapp` repository.
4. Vercel will automatically detect **Vite**:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Expand the **Environment Variables** section and add:
   | Key | Value | Notes |
   |---|---|---|
   | `SUPABASE_URL` | `https://quhpizadgfhhrdfompnm.supabase.co` | Supabase Project URL |
   | `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` | Public client key |
   | `SUPABASE_SECRET_KEY` | `sb_secret_...` | Serverless backend key |
   | `VITE_SUPABASE_URL` | `https://quhpizadgfhhrdfompnm.supabase.co` | Frontend client URL |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` | Frontend realtime key |

*(Legacy keys `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are also supported for backward compatibility).*
6. Click **Deploy**. Vercel will build the frontend bundle and serverless API in ~30 seconds!

---

### Option B: Deploy via Vercel CLI

If you have the Vercel CLI installed:

```bash
# 1. Login to Vercel
npx vercel login

# 2. Link & Deploy to Preview
npx vercel

# 3. Add Environment Variables
npx vercel env add SUPABASE_URL
npx vercel env add SUPABASE_ANON_KEY
npx vercel env add SUPABASE_SERVICE_ROLE_KEY
npx vercel env add VITE_SUPABASE_URL
npx vercel env add VITE_SUPABASE_ANON_KEY

# 4. Deploy to Production
npx vercel --prod
```

---

## Part 4: Custom Domain & Subdomains Setup

Jeemu supports 8 distinct functional views & companion tools:
- `launch.jeemu.fun` (Kickstarter Pre-launch Funnel)
- `connect.jeemu.fun` (Mobile Companion & Web Bluetooth Remote Tap)
- `feed.jeemu.fun` (Engineering Updates & Devlogs)
- `chaos.jeemu.fun` (Community Shitposting & Tower Fails)
- `journey.jeemu.fun` (Hardware Prototype Timeline)
- `login.jeemu.fun` (Team Authentication)
- `admin.jeemu.fun` (Subscriber Management & Team Publisher)
- `dashboard.jeemu.fun` (Real-time Telemetry & Click Heatmap)

### Configuring Subdomains in Vercel:
1. In your Vercel Project Dashboard, navigate to **Settings** -> **Domains**.
2. Add your primary domain: `jeemu.fun` (or `launch.jeemu.fun`).
3. Add `connect.jeemu.fun` (or a wildcard domain: `*.jeemu.fun`) pointing to your Vercel project.
4. In your DNS registrar (e.g. Cloudflare, Namecheap, GoDaddy):
   - Add a `CNAME` record with Name `*` (or `connect`) pointing to `cname.vercel-dns.com`.
5. Jeemu's router will automatically route `connect.jeemu.fun` to the Web Bluetooth companion app (`/connect.html`) and other views based on hostname!

*(Even without custom DNS, you can always navigate using paths or query parameters: `https://your-project.vercel.app/connect` or `?subdomain=connect`).*

---

## Part 5: Verifying Production Deployment

1. **API Health Check**:
   Visit `https://<your-vercel-domain>/api/health`
   You should see:
   ```json
   {
     "status": "ok",
     "service": "jeemu-api",
     "platform": "vercel-serverless",
     "timestamp": 1727092800000
   }
   ```

2. **Waitlist & VIP Submission**:
   - Go to your live site and enter an email in the reservation form.
   - Check your Supabase **Table Editor** -> `subscribers`. The new subscriber will appear instantly!

3. **Telemetry & Click Heatmap**:
   - Click around the 3D model, change categories, or drag the dock simulator.
   - Navigate to `?subdomain=dashboard` (or `dashboard.jeemu.fun`).
   - The KPI cards, funnel progression, click heatmap, and live event stream will reflect your actions in real time!
