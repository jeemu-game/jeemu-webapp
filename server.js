/**
 * JEEMU LOCAL DEVELOPMENT SERVER
 * Wraps Vercel Serverless API (/api/*) + Static File Serving
 * 
 * Supports:
 * - Supabase PostgreSQL Database (when SUPABASE_URL is defined)
 * - Local file-store fallback (data/jeemu.db.json)
 * - Subdomain router simulation (?subdomain= / host header)
 * - Vite static / dev bundle serving
 */

import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import app from './api/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

/* ================= SUBDOMAIN ROUTING MIDDLEWARE ================= */
app.use((req, res, next) => {
  const host = req.headers.host || '';
  let subdomain = 'launch'; // default

  if (host.startsWith('launch.')) subdomain = 'launch';
  else if (host.startsWith('feed.')) subdomain = 'feed';
  else if (host.startsWith('chaos.')) subdomain = 'chaos';
  else if (host.startsWith('journey.')) subdomain = 'journey';
  else if (host.startsWith('login.')) subdomain = 'login';
  else if (host.startsWith('admin.')) subdomain = 'admin';
  else if (host.startsWith('dashboard.')) subdomain = 'dashboard';

  if (req.query.subdomain) {
    subdomain = req.query.subdomain;
  }

  req.subdomainName = subdomain;
  next();
});

/* ================= STATIC ASSET SERVING ================= */
app.use(express.static(path.join(__dirname, 'public')));
app.use('/src', express.static(path.join(__dirname, 'src')));
app.use('/jeemu', express.static(path.join(__dirname, 'jeemu')));
app.use('/frames-smooth', express.static(path.join(__dirname, 'public', 'frames-smooth')));

const distPath = path.join(__dirname, 'dist');
const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(distPath);

if (isProd) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 JEEMU UNIFIED BACKEND & SUBDOMAIN ROUTER LIVE!`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`------------------------------------------------------`);
  console.log(`Cloud DB: ${process.env.SUPABASE_URL ? 'Connected to Supabase' : 'Offline Mode (data/jeemu.db.json)'}`);
  console.log(`Subdomains on jeemu.fun (or via ?subdomain=):`);
  console.log(` • launch.jeemu.fun    -> http://localhost:${PORT}?subdomain=launch`);
  console.log(` • feed.jeemu.fun      -> http://localhost:${PORT}?subdomain=feed`);
  console.log(` • chaos.jeemu.fun     -> http://localhost:${PORT}?subdomain=chaos`);
  console.log(` • journey.jeemu.fun   -> http://localhost:${PORT}?subdomain=journey`);
  console.log(` • login.jeemu.fun     -> http://localhost:${PORT}?subdomain=login`);
  console.log(` • admin.jeemu.fun     -> http://localhost:${PORT}?subdomain=admin`);
  console.log(` • dashboard.jeemu.fun -> http://localhost:${PORT}?subdomain=dashboard`);
  console.log(`======================================================\n`);
});
