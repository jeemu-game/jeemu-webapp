# Architectural Design Specification: Jeemu Redesign

**Date:** 2026-09-27  
**Status:** Approved by User  
**Target:** Clean, Bloat-Free, High-Converting Kickstarter Launch Page with Top Media Carousel, Mobile-First Responsiveness, ReactBits & Skipper UI Components, and Hardened Supabase Integration.

---

## 1. Executive Summary & Goals

The legacy Jeemu website suffered from bloat (simulated subdomains, internal team content studio, unneeded telemetry modals, and a rigid 240-frame canvas scrubber that completely failed on mobile devices). Furthermore, waitlist submissions were swallowed in client `localStorage` with unawaited, failed calls to `/api/subscribers`, resulting in zero updates appearing in the Supabase database.

This redesign completely rebuilds the web application from scratch with:
1. **100% Focused Kickstarter Launch Page**: Eliminating all bloat, fake subdomains, and disjointed admin panels.
2. **Top Hybrid Media Carousel (ReactBits / Skipper UI Style)**: Supporting high-resolution product photography, looping video demonstrations of NFC block docking, touch/swipe navigation on mobile, progress pills, and easy JSON data configuration.
3. **Flawless Mobile-First Experience**: Fluid layout using CSS Grid/Flexbox and `clamp()`, zero fixed-viewport lockups, and optimized asset delivery ensuring fast load times on all screens.
4. **Hardened Multi-Layer Supabase Architecture**:
   - Server-shielded API (`/api/subscribers` and `/api/waitlist/count`) protecting against DDoS and database spam.
   - IP rate-limiting via `express-rate-limit` (max 5 waitlist submissions per 5 minutes per IP).
   - Invisible honeypot bot trap field to drop automated spam silently.
   - Direct persistence to the Supabase `subscribers` table using server-held service credentials.
   - Real-time backer count query displayed live on the navbar and hero.
5. **High-Converting 2-Step Micro-Funnel**:
   - Step 1: Backer enters email/name -> Instant Supabase insert, generates unique referral link.
   - Step 2: Immediate unlock of backer referral card + optional $1 VIP Early Bird reservation (45% off guaranteed + Free Gold-Stamped Founder's Block) with Stripe payment integration.

---

## 2. Technology Stack & Design System

- **Frontend**: Vite + React 18, utilizing modular ReactBits & Skipper UI interaction patterns (Spotlight cursor glow cards, Spring Carousel with touch gestures, Magnetic Buttons, Animated Rolling Counters).
- **Styling**: Vanilla CSS with scoped design tokens, modern dark luxury aesthetic:
  - Surface Obsidian: `#0b0d0f`, `#121518`, `#1a1e22`
  - Accent Amber/Gold (Beechwood flame): `#f59e0b`, `#ff6b35`
  - Emerald Live Status: `#10b981`
  - Border Glass: `rgba(255, 255, 255, 0.08)`
  - Backdrop Filter: `blur(16px)`
  - Fonts: `Plus Jakarta Sans` (headlines & body), `JetBrains Mono` (specs & metrics).
- **Backend & API**: Node.js + Express (`server.js` and `api/index.js`), with `@supabase/supabase-js`, `dotenv`, `cors`, and `express-rate-limit`.

---

## 3. Detailed Component Architecture

### 3.1. Sticky Glass Navbar (`Navbar.jsx`)
- **Branding**: Jeemu logotype with flame mark.
- **Status Indicator**: Animated emerald live beacon with live backer counter fetched from Supabase.
- **Quick Action**: Magnetic hover "Reserve $1 VIP" button that smoothly scrolls to the micro-funnel.

### 3.2. Top Hybrid Media Carousel (`HeroCarousel.jsx`)
- **Slide Types**: Supports both looping HTML5/MP4 video clips and high-resolution WebP/JPG product photography.
- **Initial Slide Manifest**:
  1. *Video Demo*: Sub-80ms block docking animation triggering the IPS screen.
  2. *Hardware Beauty*: Solid German beechwood tower, laser-etched numbers, embedded 13.56MHz NFC tags.
  3. *Smart Pedestal Dock*: Panoramic IPS screen, internal rechargeable battery, phone-free game master.
  4. *Mobile App & AI Creator*: Visual preview of AI generating 45 unique prompts in seconds.
  5. *Founder's Edition Box*: Magnetic-latch luxury packaging and gold-stamped collector block.
- **Interactions**:
  - Touch/swipe gestures on mobile (touch event listeners with threshold detection).
  - Next/Previous navigation buttons with glassmorphic styling.
  - Interactive progress indicator pills.
  - Slide counter display (`01 / 05`).
  - Auto-play with pause on hover/interaction.

### 3.3. 2-Step Micro-Funnel (`MicroFunnel.jsx`)
- **Step 1: Email Waitlist**:
  - Input fields: Email (required, regex-validated) and Name (optional).
  - Honeypot bot trap field (`hp_jeemu_check`, hidden via CSS and `tabindex="-1"`).
  - Submission state: Loading spinner, disabled state to prevent double-submit.
- **Step 2: VIP Upgrade & Referral Share Card**:
  - Success message confirming their spot is secured in Supabase.
  - Unique shareable referral link (`https://jeemu.fun/?ref=JEEMU-XXXX`) with 1-click clipboard copy.
  - $1 VIP Early Bird prompt: Direct CTA to Stripe Checkout to lock in the 45% discount ($89 vs $159 retail) and the Gold-Stamped Founder's Block.
  - Social share links (WhatsApp, X, Facebook).

### 3.4. 3-Pillar Spotlight Grid (`SpotlightPillars.jsx`)
- ReactBits cursor-following spotlight effect on hover.
- Cards:
  1. *Handcrafted Beechwood + NFC*: Invisible dual-frequency micro-tags, double-sanded beeswax matte finish for buttery sliding.
  2. *Standalone Smart Dock*: Panoramic IPS screen, internal battery (8+ hours), instant sub-80ms read time.
  3. *Zero Phones at Table*: Sync via Bluetooth once before game night, then put phones away. Zero notifications or screen fatigue.

### 3.5. 7 Experience Packs (`ExperiencePacks.jsx`)
- Interactive tab switcher for the 7 official game categories:
  - 🍻 Drinking Games
  - ⚡ Fitness & Movement
  - 🧩 Kids Math & Logic
  - 🤝 Team Workshops
  - ❄️ Icebreakers
  - 💍 Weddings & Receptions
  - ☕ Café & Social
- Selecting a category updates the dynamic IPS dock screen preview showing the exact challenge and reward text.

### 3.6. AI-Assisted Game Studio (`AiStudioPreview.jsx`)
- Interactive prompt showcase demonstrating how players can type any theme (e.g. *"Spicy Date Night"* or *"Tech Startup Retrospective"*) to generate a custom 45-block game pack.

### 3.7. Transparent Kickstarter Pricing (`PricingTier.jsx`)
- Comparison grid:
  - Retail Price: $159
  - Kickstarter Early Bird: $99
  - VIP Backer: **$89 (Save 45%)** + Guaranteed Batch 01 delivery + Free Gold-Stamped Founder's Block + Lifetime Access to Marketplace Presets.
- Quick $1 Reservation CTA.

### 3.8. FAQ & Footer (`FaqFooter.jsx`)
- Accordion answering common questions (battery life, phone-free gameplay, refundable $1 deposit policy, shipping dates).
- Clean, minimal footer with social links, copyright, and Kickstarter disclaimer.

---

## 4. Backend & Security Architecture

### 4.1. Server API Endpoints
- `GET /api/waitlist/count`: Returns the exact number of rows in `subscribers`. Cached for 30s. Rate limited to 60 req/min.
- `POST /api/subscribers`:
  - Rate limiting: max 5 requests per 5 minutes per IP.
  - Honeypot validation: if `hp_jeemu_check` has content, immediately returns `{ success: true }` without writing to the database.
  - Input sanitization: Email format check (RFC 5322 regex), string length bounds (max 100 characters), XSS tag escaping.
  - Database operation: Executes `supabase.from('subscribers').insert(...)` using server-held `SUPABASE_SECRET_KEY`.
  - Deduplication: If the email already exists, fetches and returns the existing backer record without throwing errors.
  - Returns: `{ success: true, subscriber: { id, email, name, referralCode } }`.

### 4.2. Environment Variables
- `SUPABASE_URL`: Supabase project URL (`https://quhpizadgfhhrdfompnm.supabase.co`).
- `SUPABASE_SECRET_KEY`: Supabase service role / secret key (server-side only, never leaked to client).
- `PORT`: Server port (default 3000).
- `STRIPE_PAYMENT_LINK`: Configured Stripe checkout URL.

---

## 5. Mobile Responsiveness & Performance Plan

1. **Fluid Layout**: All font sizes, gutters, and card widths use `clamp()` and CSS Grid with `minmax()`.
2. **Touch Optimization**: The top carousel supports native touch events (`touchstart`, `touchmove`, `touchend`) with momentum damping.
3. **Asset Optimization**: Images served in modern WebP format with `srcset` and responsive sizes. Videos configured with `preload="metadata"`, `muted`, `playsinline`, and `loop`.
4. **Zero Layout Shifts**: Aspect-ratio containers for all media elements to guarantee CLS (Cumulative Layout Shift) < 0.05.

---

## 6. Verification & Testing Strategy

1. **Automated Server Tests**:
   - Verify `/api/waitlist/count` returns accurate count from Supabase.
   - Verify `/api/subscribers` inserts valid backer records into Supabase and handles duplicates gracefully.
   - Verify rate limiting blocks excessive requests (> 5 per 5 mins).
   - Verify honeypot field drops bot requests.
2. **End-to-End Browser Testing**:
   - Desktop viewports (1920x1080, 1440x900).
   - Mobile viewports (iPhone SE 375x667, iPhone 14 Pro 393x852, iPad 768x1024).
   - Carousel swipe, next/prev clicks, and auto-advance.
   - Micro-funnel complete flow: email submission -> verify row in Supabase -> referral code copy -> Stripe redirect.
