# Wayfinder Map: Security Vulnerability Remediation

**Map ID:** `wayfinder:map:security-resolution`  
**Target:** `jeemu-webapp`  
**Reference Document:** [`security_best_practices_report.md`](file:///d:/Projects/jeemu/jeemu-webapp/security_best_practices_report.md)  
**Status:** **ALL 10 TICKETS RESOLVED & VERIFIED**  

---

## Destination
Complete code remediation, hardening, and verification of all 10 security findings from [`security_best_practices_report.md`](file:///d:/Projects/jeemu/jeemu-webapp/security_best_practices_report.md) across the FastAPI backend, Vercel configuration, Google Apps Script, and npm package manifests, with 100% test suite passage.

---

## Notes
- **Execution Mode:** Execution carried into the map itself.
- **Skills Consulted:** `security-review`, `better-auth-security-best-practices`, `security-and-hardening`, `security-best-practices`.
- **Constraint:** Zero regression on existing site capabilities.
- **Result:** 30/30 pytest tests passed in 6.45s; `npm audit` reports 0 vulnerabilities in both root and frontend; Vite production build compiled cleanly.

---

## Ticket Resolution Ledger

| Ticket | Label | Title | Resolution Status |
| :--- | :--- | :--- | :--- |
| **T-01** | `wayfinder:task` | Fix [SEC-002] Restore `require_supabase_auth` & Timing-Safe Admin Verification | **CLOSED** (Implemented in `auth.py` & `config.py`) |
| **T-02** | `wayfinder:task` | Fix [SEC-001] Eliminate Wildcard CORS Origin with Credentials in Backend & Vercel | **CLOSED** (Restricted to `settings.allowed_cors_origins`) |
| **T-03** | `wayfinder:task` | Fix [SEC-004] Restrict Unsigned Stripe Webhook Events to Unit Tests Only | **CLOSED** (Strictly gated to `settings.ENV == "test"`) |
| **T-04** | `wayfinder:task` | Fix [SEC-003] Harden Rate Limiter IP Extraction & Fix In-Memory Key Leak | **CLOSED** (Added `x-forwarded-for` parsing & 120s TTL key pruning) |
| **T-05** | `wayfinder:task` | Fix [SEC-008] Inject Standard Security Headers in FastAPI & Vercel Edge | **CLOSED** (`SecurityHeadersMiddleware` & `vercel.json` headers) |
| **T-06** | `wayfinder:task` | Fix [SEC-006] Sanitize Public Exception Disclosures Across API Routers | **CLOSED** (Sanitized in `waitlist.py`, `admin.py`, `subscribers.py`) |
| **T-07** | `wayfinder:task` | Fix [SEC-007] Add Secret Token Validation to Google Sheets Webhook Sync | **CLOSED** (Secret verification added to `google-apps-script.js` & adapter) |
| **T-08** | `wayfinder:task` | Fix [SEC-009] Harden Pydantic Schemas with EmailStr & Length Bounds | **CLOSED** (Field length bounds added to `SubscriberCreateRequest`) |
| **T-09** | `wayfinder:task` | Fix [SEC-010] Offload Synchronous Stripe SDK Calls with `asyncio.to_thread` | **CLOSED** (Wrapped `stripe.checkout.Session.create` in threadpool) |
| **T-10** | `wayfinder:task` | Fix [SEC-005] Upgrade Vulnerable Node Dependencies via `npm audit fix` | **CLOSED** (`0 vulnerabilities` in root & frontend) |

---

## Decisions so far

- **[T-01 Decisions]**: Restored `require_supabase_auth` validating Supabase Bearer JWTs via `/auth/v1/user`, session validation, and email allowlist checking. Protected legacy `verify_admin_auth` using `hmac.compare_digest` to prevent timing attacks. Required `UNSUBSCRIBE_SECRET` to be defined in production.
- **[T-02 Decisions]**: Completely eliminated `Access-Control-Allow-Origin: *` with credentials. Added dynamic `allowed_cors_origins` property in `config.py` encompassing `SITE_URL`, localhost development ports, and optional `ALLOWED_ORIGINS` environment overrides. Removed wildcard credentials block from `vercel.json`.
- **[T-03 Decisions]**: Restriced unsigned webhook acceptance strictly to `settings.ENV == "test"`, ensuring all remote environments (dev, preview, staging, prod) require cryptographic `stripe-signature` verification.
- **[T-04 Decisions]**: `RateLimiterMiddleware` now parses `x-forwarded-for` and `x-real-ip` to correctly isolate individual client IPs behind Vercel/Cloudflare proxies, and runs an automatic 120s pruning routine to delete stale keys from memory.
- **[T-05 Decisions]**: Registered `SecurityHeadersMiddleware` setting `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`. Mirrored these headers in `vercel.json` for edge caching.
- **[T-06 Decisions]**: Replaced raw `str(e)` return values with generic customer-safe error messages in `waitlist.py`, `admin.py`, and `subscribers.py`, logging the complete exception server-side.
- **[T-07 Decisions]**: Added `SHEETS_WEBHOOK_SECRET` verification in Google Apps Script `doPost(e)` and included `secret` payload field in `GoogleSheetsAdapter.sync_subscriber`.
- **[T-08 Decisions]**: Bounded input fields in `SubscriberCreateRequest` (`email`, `name`, `ref`, `hp_jeemu_check`) with max length limits.
- **[T-09 Decisions]**: Avoided asyncio event-loop blocking by running `stripe.checkout.Session.create` in worker threads via `asyncio.to_thread`.
- **[T-10 Decisions]**: Ran `npm audit fix` in both root and frontend projects, patching `body-parser`, `nodemailer`, `source-map-js`, and `vite`.

---

## Verification
- **Pytest:** 30 passed in 6.45 seconds (`backend/tests/`).
- **NPM Audit:** 0 vulnerabilities in both root and frontend packages.
- **Vite Build:** `npm run build` compiled without errors.
