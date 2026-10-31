# Changelog

All notable changes to the Jeemu WebApp and Tabletop System are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] - Production hardening

### Security
- No more default secrets: `ADMIN_PASSWORD`, `UNSUBSCRIBE_SECRET` and `SUPABASE_URL` have no built-in values (the old defaults were public in the repo). Unset means disabled, never guessable.
- Admin routes accept a Supabase login only for emails listed in `ADMIN_EMAILS` (empty list admits nobody); admin password comparison no longer crashes on non-ASCII input.
- Signup no longer discloses an existing subscriber's record (referral code, Stripe IDs); re-sent confirmation emails are throttled per address; new-signup responses omit internal fields.
- Supabase lookups use exact matches with encoded parameters. The previous `ilike` filters treated `%` and `_` as wildcards, which let an address like `%@gmail.com` match other subscribers.
- Unsubscribe and resubscribe always require the signed token (the development-mode bypass is removed); resubscribe previously accepted any email.
- Analytics events are size- and shape-limited; post reactions are restricted to the three known types; oversized request bodies get a 413; the public waitlist count no longer returns raw error text.

### Reliability
- Environment values are trimmed of stray whitespace, line breaks and wrapping quotes (a pasted trailing newline on a Vercel variable used to crash every database call).
- Any Vercel deployment defaults to `ENV=production`, so a forgotten `ENV` can no longer expose `/docs` or skip security checks.
- Unhandled errors return a JSON message with a request ID (and are logged with the traceback) instead of a bare text 500; the signup form shows a friendly message if the server ever replies with non-JSON.
- Email is sent from a worker thread (SMTP no longer blocks the server) and falls back to Resend when Hostinger SMTP refuses; welcome email and Google Sheets sync run in parallel.
- The startup log now shows the real Supabase host instead of a hardcoded label.

### Database
- `supabase/schema.sql` rewritten: adds the missing `unsubscribed`, `unsubscribed_at` and `stripe_session_id` columns, removes the public read/update policies on `subscribers`, and grants access to the server role only.

---

## [Unreleased] - Merged PR #4 & Main Integration

### Overview
This release resolves and unifies two major parallel development tracks:
1. **Track A (`main` / PR #3)**: Brand identity overhaul, vector/raster asset design system, manufacturer-grade PRD, and SMTP infrastructure.
2. **Track B (`PR #4` / fork)**: Complete 3D Blender story video rendering pipeline, bidirectional scroll story player, retro CRT/arcade styling pass, Stripe payment safety hardening, and codebase deduplication.

The incoming PR's front-facing story player and interactive website have been adopted as the primary user experience, while integrating the complete logo suite, brand assets, and technical documentation from `main`.

---

### Track B: Incoming PR #4 (Fork Rebuild & Interactive 3D Story)

#### Added
- **Interactive Story Player**:
  - `StoryPlayer.jsx` component delivering scroll-driven bidirectional video scrubbing (forward and reverse playback on scroll).
  - Perspective-mapped dynamic OLED screen overlay (`GameScreen.jsx` & `quad.js`) tracking the 3D console screen across rotation and zoom.
  - Stage-based narrative stops: tagline close-up, block drop, physical tap interaction, gameplay challenge, and waitlist conversion.
  - Dedicated mobile portrait video renders (9:16 aspect ratio) with automatic device and orientation detection (`stages.js`).
- **3D Blender Animation & Rendering Pipeline**:
  - Procedural Blender scene generator (`scripts/blender/build_scene.py`) featuring realistic maple/beech wood materials, edge wear, dings, and laser-etched lettering.
  - Video encoder script (`scripts/blender/encode_story_video.py`) generating both forward and reverse MP4/WebM video sets with OptiX denoiser optimizations.
  - High-resolution video assets for desktop and mobile devices in `public/story/`.
  - OpenGraph social share image generator (`scripts/make_og_image.py`).
- **Retro Arcade Design System**:
  - Custom pixel-art cursor system and CRT scanline aesthetics (`src/story.css`).
  - Pixel font styling (`Pixelify Sans`, `Silkscreen`) for interactive UI headings, badges, and counters.
  - New modular sections: `HowItWorks.jsx`, `DepositStep.jsx`, and `Waitlist.jsx` with real-time feedback.
- **Payment & Backend Security Hardening**:
  - Webhook signature verification and production environment enforcement in `backend/tests/test_stripe.py`.
  - Safeguard against foreign payment links when deposits are disabled.
  - Streamlined, high-conversion email receipt template for VIP deposits (`signup_confirmation.html`).
- **Repository Architecture**:
  - Dual-sync script (`scripts/sync-frontend.mjs`) to maintain exact parity between root development and `frontend/` Docker/Vercel build directories.

#### Removed
- Removed legacy, heavy 3D canvas hardware simulator (`HardwareSimulator.jsx`).
- Removed deprecated UI components (`MicroFunnel.jsx`, `PricingTier.jsx`, `SpotlightPillars.jsx`, `AiStudioPreview.jsx`, `HeroCarousel.jsx`).
- Purged legacy 4,700-line monolithic CSS stylesheet (`src/css/style.css`) and redundant WebP frame sequences in favor of streaming video.

---

### Track A: `main` (Brand System, Assets & Engineering Specs)

#### Added
- **Official Brand Design System**:
  - Comprehensive brand identity guide (`documentation/brand-guide.md`) detailing typography, color palettes (Electric Jade `#00d97e`, Forest Dark Charcoal `#0c100e`), and voice.
  - Complete multi-format logo suite in `public/brand/logos/` and `frontend/public/brand/logos/`:
    - Horizontal logos (Standard, Dark Background, Light).
    - Stacked logo lockups.
    - Laser-etch specifications for wooden block manufacturing.
    - App icons and favicon sets in both vector SVG and 300 DPI PNG formats.
  - Branded mascot expressions for the Jeemu Frog (`chill`, `kaboom`, `shook`, `sleepy`, `smitten`).
  - Typography assets: `BagelFatOne-Regular` and `Combo-Regular`.
- **Manufacturer-Ready Hardware Documentation**:
  - Complete Product Requirements Document (`documentation/PRD_Manufacturer_Ready_Jeemu_Smart_Jenga.md`) specifying:
    - Capacitive and optical block-sensor matrices.
    - ESP32-S3 microcontroller architecture and power budgeting.
    - Dimensioned enclosure tolerances (75x25x15mm blocks, 54 pieces).
    - PCB layout guidelines and Bill of Materials (BOM) target costs.
- **Core Narrative**:
  - Brand storytelling reference document (`documentation/core-story.md`).
- **Email Infrastructure**:
  - Enhanced SMTP delivery adapter (`backend/app/adapters/smtp_email.py`) with support for authenticated relay configurations and branded headers.

---

## [1.0.0] - Baseline Tabletop Platform
- Initial release of the Jeemu smart wooden tower console web platform.
- FastAPI backend with Supabase waitlist integration.
- Responsive React landing page with Vite bundler configuration.
- Docker compose and Vercel cloud deployment setup.
