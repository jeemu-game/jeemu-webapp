/**
 * JEEMU SERVER — Unified Backend API & Static Asset Serving
 * 
 * Supports:
 * - Supabase PostgreSQL Cloud Database
 * - Hardened rate-limiting & anti-bot protection
 * - Vite static build serving / development routing
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
