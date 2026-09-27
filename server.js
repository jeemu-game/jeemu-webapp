/**
 * JEEMU SERVER — Unified Backend API & Static Asset Serving
 * 
 * Supports:
 * - Supabase PostgreSQL Cloud Database
 * - Hardened rate-limiting & anti-bot protection
 * - Serves compiled Vite production bundle (dist/) or Vite HMR dev middleware
 */

import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import express from 'express';
import { fileURLToPath } from 'url';
import app from './api/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

/* ================= STATIC ASSET SERVING ================= */
app.use(express.static(path.join(__dirname, 'public')));
app.use('/src', express.static(path.join(__dirname, 'src')));

const distPath = path.join(__dirname, 'dist');
const hasDist = fs.existsSync(distPath);

if (hasDist && process.env.VITE_DEV !== 'true') {
  console.log('📦 Serving compiled production bundle from dist/');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  console.log('⚡ Starting Vite development middleware (instant JSX compilation)...');
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });
  app.use(vite.middlewares);
}

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 JEEMU BACKEND & KICKSTARTER PLATFORM LIVE!`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`------------------------------------------------------`);
  console.log(`Database: ${process.env.SUPABASE_URL ? 'Connected to Supabase PostgreSQL' : 'Offline Mode'}`);
  console.log(`API endpoints:`);
  console.log(` • GET  /api/health`);
  console.log(` • GET  /api/waitlist/count`);
  console.log(` • POST /api/subscribers`);
  console.log(` • POST /api/stripe/create-session`);
  console.log(`======================================================\n`);
});
