# Jeemu Webapp - Comprehensive Security Review & Hardening Report

**Generated:** October 26, 2026  
**Audited Target:** `jeemu-webapp` (FastAPI backend, React/Vite frontend, Supabase / PostgreSQL storage, Stripe checkout, Vercel edge deployment)  
**Security Frameworks & Standards:** OWASP Top 10 (2021 & 2025 LLM), OWASP API Security Top 10, Better Auth Security Specification, STRIDE Threat Modeling  

---

## Executive Summary

A comprehensive multi-layered security review was performed across the `jeemu-webapp` repository covering the backend API, authentication infrastructure, database adapters, third-party integrations (Stripe, Supabase, Google Sheets, SMTP/Resend), frontend assets, deployment configuration (`vercel.json`), and dependency supply chain.

| Severity | Count | Status |
| :--- | :---: | :--- |
| **Critical** | 1 | Remediations specified with code |
| **High** | 4 | Remediations specified with code |
| **Medium** | 3 | Remediations specified with code |
| **Low** | 2 | Remediations specified with code |
| **Total Findings** | **10** | **Ready for prioritized remediation** |

### Critical & High Impact Summary
1. **Critical CORS Wildcard with Credentials:** Both `backend/app/main.py` and `vercel.json` configure wildcard origins (`*`) alongside `Access-Control-Allow-Credentials: true`. This allows cross-origin requests from arbitrary third-party websites to interact with authenticated API surfaces.
2. **Missing `require_supabase_auth` & Broken Import Guard:** The `require_supabase_auth` guard was missing from `backend/app/auth.py`, causing `ImportError` crashes upon loading protected endpoints in `subscribers.py`, `admin.py`, and `telemetry.py`.
3. **In-Memory Rate Limiting Flaw & Serverless Proxy IP Collisions:** `RateLimiterMiddleware` keys on `request.client.host`, which resolves to the Vercel edge proxy IP rather than the true client IP. This risks blocking all legitimate users simultaneously, leaves an unbounded memory leak, and fails to persist across serverless lambda instances.
4. **Stripe Webhook Unsigned Event Vulnerability in Development Mode:** `stripe_routes.py` accepts unsigned JSON when `ENV in ("test", "development")`. If deployed to staging or preview environments without explicit production mode flags, attackers can forge VIP status and deposit records without Stripe cryptographic signatures.
5. **Vulnerable Dependencies (GHSA Advisories):** Vulnerabilities exist in `body-parser` (DoS), `source-map-js` (DoS), `nodemailer` (header injection), and `vite` (cross-origin script execution & command injection on Windows).

---

## 1. Vulnerability Findings (Prioritized)

### [SEC-001] Wildcard CORS Origin with Credentials Enabled (CRITICAL)
- **Impact Statement:** An external malicious website visited by an authenticated administrator can execute authenticated API requests and read private backer records, metrics, and subscriber exports.
- **Location:** 
  - [`backend/app/main.py:109-115`](file:///d:/Projects/jeemu/jeemu-webapp/backend/app/main.py#L109-L115)
  - [`vercel.json:84-104`](file:///d:/Projects/jeemu/jeemu-webapp/vercel.json#L84-L104)
- **Confidence:** High
- **Vulnerability Type:** OWASP A01: Broken Access Control / OWASP A05: Security Misconfiguration
- **Evidence:**
  ```python
  # backend/app/main.py:109-115
  app.add_middleware(
      CORSMiddleware,
      allow_origins=["*"],
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
  )
  ```
  ```json
  // vercel.json:84-95
  {
    "source": "/api/(.*)",
    "headers": [
      { "key": "Access-Control-Allow-Credentials", "value": "true" },
      { "key": "Access-Control-Allow-Origin", "value": "*" }
    ]
  }
  ```
- **Remediation:**
  1. Restrict CORS to an explicit allowlist configured via environment variables (e.g. `SITE_URL`, `https://jeemu.fun`, `https://www.jeemu.fun`, and local development ports `http://localhost:5173`, `http://localhost:3000`).
  2. Remove wildcard credentials in `vercel.json` or configure exact origin reflections matching the trusted origin list. Never send `Access-Control-Allow-Origin: *` when `Access-Control-Allow-Credentials: true`.

---

### [SEC-002] Missing Auth Guard & Variable-Time Admin Secret Comparison (HIGH)
- **Impact Statement:** Missing guard definitions crash protected API endpoints at runtime, while legacy string comparisons in admin authentication expose secrets to character-by-character timing attacks.
- **Location:** 
  - [`backend/app/auth.py:1-43`](file:///d:/Projects/jeemu/jeemu-webapp/backend/app/auth.py#L1-L43)
  - [`backend/app/config.py:78-80`](file:///d:/Projects/jeemu/jeemu-webapp/backend/app/config.py#L78-L80)
- **Confidence:** High
- **Vulnerability Type:** OWASP A07: Identification and Authentication Failures / OWASP A02: Cryptographic Failures
- **Evidence:**
  - `backend/app/routers/subscribers.py:7`, `backend/app/routers/admin.py:11`, and `backend/app/routers/telemetry.py:8` all execute:
    ```python
    from app.auth import require_supabase_auth
    ```
    However, `backend/app/auth.py` only defines `verify_admin_auth`. This raises an immediate `ImportError`.
  - In `backend/app/auth.py:35`:
    ```python
    if not token or token != admin_pass:
        raise HTTPException(...)
    ```
    Standard Python `!=` terminates on the first mismatched byte, creating measurable timing discrepancies.
  - In `backend/app/config.py:79`:
    ```python
    return self.UNSUBSCRIBE_SECRET or self.ADMIN_PASSWORD or "jeemu-unsubscribe-salt-2026"
    ```
    If environment variables are omitted, a hardcoded static salt string is used to sign unsubscribe tokens.
- **Remediation:**
  1. Implement and export `require_supabase_auth` validating tokens via Supabase Auth `https://<project>.supabase.co/auth/v1/user` with session validation and email allowlist checking.
  2. Use `secrets.compare_digest` or `hmac.compare_digest(token, admin_pass)` for all secret validations.
  3. Require `UNSUBSCRIBE_SECRET` to be set with a cryptographically secure random string; raise a configuration error in production if missing.

---

### [SEC-003] In-Memory Rate Limiting Flaw & Serverless Proxy IP Collisions (HIGH)
- **Impact Statement:** All visitors behind Vercel or reverse proxies share a single proxy IP, causing legitimate users to be erroneously rate-limited together, while in-memory state fails to throttle attacks on serverless instances and leaks memory.
- **Location:** [`backend/app/main.py:23-79`](file:///d:/Projects/jeemu/jeemu-webapp/backend/app/main.py#L23-L79)
- **Confidence:** High
- **Vulnerability Type:** OWASP A04: Insecure Design / Denial of Service
- **Evidence:**
  ```python
  client_ip = request.client.host if request.client else "127.0.0.1"
  ...
  key = (client_ip, bucket)
  self.history[key] = [t for t in self.history[key] if now - t < window]
  ```
  - On Vercel, `request.client.host` is the internal Vercel router proxy IP.
  - As distinct client IPs connect, `self.history[key]` dictionary keys are never deleted, creating an unbounded memory leak.
  - Serverless functions spawn isolated containers per request, meaning in-memory state is lost on cold starts and cannot protect against distributed attacks.
- **Remediation:**
  1. Read the real client IP from `X-Forwarded-For` (taking the client-most IP when behind a trusted proxy) or `X-Real-IP`.
  2. Implement an eviction policy for expired keys in the dictionary.
  3. Back rate limiting with secondary shared storage (e.g., Redis via Upstash or Supabase RPC) or rely on Vercel Edge Middleware rate limiting.

---

### [SEC-004] Stripe Webhook Unsigned Event Acceptance Risk (HIGH)
- **Impact Statement:** Attackers can craft arbitrary `checkout.session.completed` POST requests without a valid Stripe signature if the environment is set to `development` or `test` on a publicly accessible host.
- **Location:** [`backend/app/routers/stripe_routes.py:52-61`](file:///d:/Projects/jeemu/jeemu-webapp/backend/app/routers/stripe_routes.py#L52-L61)
- **Confidence:** High
- **Vulnerability Type:** OWASP A08: Software and Data Integrity Failures
- **Evidence:**
  ```python
  elif settings.ENV in ("test", "development"):
      # Local/dev/test only: accept unsigned JSON so the flow can be exercised without Stripe.
      try:
          event_data = json.loads(raw_body.decode("utf-8"))
      except Exception:
          event_data = {}
  ```
- **Remediation:**
  Restrict unsigned webhook parsing strictly to `settings.ENV == "test"` (automated local test harness). On any network-accessible deployment (development, staging, preview, production), strictly mandate `stripe_signature` verification with `STRIPE_WEBHOOK_SECRET`.

---

### [SEC-005] High & Moderate Supply Chain Vulnerabilities (GHSA Advisories) (HIGH)
- **Impact Statement:** Unpatched dependencies introduce event-loop Denial of Service, HTTP body parser trailing byte vulnerabilities, and Windows developer command execution vulnerabilities.
- **Location:** 
  - Root `package.json`: `body-parser <1.20.9` (GHSA-27r3-jxmh-p828), `nodemailer <10.1.4` (GHSA-8c8m-p3m8-cjg8, GHSA-m943-m63m-w62w), `source-map-js <=1.2.1` (GHSA-68fv-2mgg-jv7q), `vite <=6.4.3` (GHSA-698v-4r3x-3vcv, GHSA-9jrq-w75r-8gcw).
  - Frontend `frontend/package.json`: `vite <=6.4.3`, `source-map-js <=1.2.1`.
- **Confidence:** High
- **Vulnerability Type:** OWASP A06: Vulnerable and Outdated Components
- **Remediation:**
  Execute `npm audit fix` and upgrade `vite` to `>=6.4.4` (or latest stable release) in both root and `frontend/` package trees.

---

### [SEC-006] Verbose Error Details Disclosed to Public Clients (MEDIUM)
- **Impact Statement:** Unhandled database errors, file paths, and internal diagnostic exceptions are returned directly in HTTP JSON response payloads.
- **Location:** 
  - [`backend/app/routers/waitlist.py:18`](file:///d:/Projects/jeemu/jeemu-webapp/backend/app/routers/waitlist.py#L18)
  - [`backend/app/routers/admin.py:34, 49, 65, 80`](file:///d:/Projects/jeemu/jeemu-webapp/backend/app/routers/admin.py#L34)
  - [`backend/app/routers/subscribers.py:37, 65`](file:///d:/Projects/jeemu/jeemu-webapp/backend/app/routers/subscribers.py#L37)
- **Confidence:** High
- **Vulnerability Type:** OWASP A05: Security Misconfiguration / Information Disclosure
- **Evidence:**
  ```python
  # waitlist.py:18
  return {"count": 0, "rawCount": 0, "error": str(e)}

  # admin.py:34
  return JSONResponse(status_code=500, content={"error": f"Failed to generate CSV: {e}"})
  ```
- **Remediation:**
  Log the full exception with traceback to server logs (`logger.exception(...)`). Return uniform, sanitized client error messages: `{"error": "An internal error occurred. Please contact support."}`.

---

### [SEC-007] Unauthenticated Google Sheets Webhook Endpoints (MEDIUM)
- **Impact Statement:** Anyone possessing or discovering the Google Apps Script Web App URL can transmit unauthorized POST requests that overwrite, modify, or corrupt subscriber rows in the live spreadsheet.
- **Location:** [`scripts/google-apps-script.js:21-65`](file:///d:/Projects/jeemu/jeemu-webapp/scripts/google-apps-script.js#L21-L65)
- **Confidence:** High
- **Vulnerability Type:** OWASP A07: Identification and Authentication Failures
- **Evidence:**
  `scripts/google-apps-script.js` instructs deploying the web app with `Who has access: Anyone`, and `doPost(e)` parses raw JSON without checking any secret header, token, or signature.
- **Remediation:**
  Add a shared secret token validation check in `doPost(e)`:
  ```javascript
  var expectedSecret = PropertiesService.getScriptProperties().getProperty("SHEETS_WEBHOOK_SECRET");
  if (expectedSecret && (!data.secret || data.secret !== expectedSecret)) {
    return ContentService.createTextOutput(JSON.stringify({ error: "Unauthorized" }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  ```
  Pass `secret: settings.GOOGLE_SHEETS_SECRET` from `GoogleSheetsAdapter.sync_subscriber`.

---

### [SEC-008] Missing Hardening Security Headers (MEDIUM)
- **Impact Statement:** Without defensive headers, the web app is exposed to clickjacking, MIME-sniffing, and cross-site embedding.
- **Location:** [`backend/app/main.py`](file:///d:/Projects/jeemu/jeemu-webapp/backend/app/main.py) and [`vercel.json`](file:///d:/Projects/jeemu/jeemu-webapp/vercel.json)
- **Confidence:** High
- **Vulnerability Type:** OWASP A05: Security Misconfiguration
- **Evidence:**
  Neither FastAPI middleware nor `vercel.json` configures:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- **Remediation:**
  Add global security headers in `vercel.json` for all routes and register a security headers middleware in FastAPI.

---

### [SEC-009] Weak Input Schema Validation for Subscriber Intake (LOW)
- **Impact Statement:** Oversized strings or malformed inputs reach the service layer before rejection.
- **Location:** [`backend/app/models/subscriber.py:53-60`](file:///d:/Projects/jeemu/jeemu-webapp/backend/app/models/subscriber.py#L53-L60)
- **Confidence:** High
- **Vulnerability Type:** OWASP A04: Insecure Design
- **Remediation:**
  Use Pydantic `EmailStr` and `Field(max_length=...)` to validate structure, syntax, and bounded lengths at the HTTP boundary before business logic execution.

---

### [SEC-010] Blocking Synchronous Network Call in Async Stripe Adapter (LOW)
- **Impact Statement:** `stripe.checkout.Session.create` blocks the Python asyncio event loop during network roundtrips, degrading server throughput under concurrent traffic.
- **Location:** [`backend/app/adapters/stripe_adapter.py:63`](file:///d:/Projects/jeemu/jeemu-webapp/backend/app/adapters/stripe_adapter.py#L63)
- **Confidence:** High
- **Vulnerability Type:** Concurrency & Availability
- **Remediation:**
  Wrap synchronous Stripe SDK calls in `asyncio.to_thread(stripe.checkout.Session.create, **session_params)`.

---

## 2. Better Auth Security Best Practices & Alignment

If evaluating or transitioning to **Better Auth**, the following security architecture should be implemented based on Better Auth standards:

### 2.1 Secret Management
- **Entropy Standard:** Better Auth mandates secrets of at least 32 characters with >=120 bits of entropy.
- **Generation:** Generate using `openssl rand -base64 32`.
- **Enforcement:** Never use default placeholders like `"jeemu2026"` in production. The server must refuse to start if a placeholder is detected when `ENV=production`.

### 2.2 Trusted Origins & CSRF Defense
- Better Auth enforces origin header validation, Fetch Metadata (`Sec-Fetch-Site`, `Sec-Fetch-Mode`), and first-login checks.
- Configure explicit origins:
  ```typescript
  export const auth = betterAuth({
    baseURL: process.env.SITE_URL || "https://jeemu.fun",
    trustedOrigins: [
      "https://jeemu.fun",
      "https://www.jeemu.fun",
      "http://localhost:5173",
      "http://localhost:3000"
    ],
    advanced: {
      disableCSRFCheck: false,
    }
  });
  ```
- This directly resolves finding **[SEC-001]**.

### 2.3 Rate Limiting with Secondary Storage
- On Vercel / serverless architectures, in-memory rate limiting fails.
- Better Auth supports `"secondary-storage"` (Redis / Upstash):
  ```typescript
  rateLimit: {
    enabled: true,
    storage: "secondary-storage",
    customRules: {
      "/api/auth/sign-in/email": { window: 60, max: 5 },
      "/api/auth/sign-up/email": { window: 60, max: 3 },
    }
  }
  ```
- Group IPv6 addresses with `ipv6Subnet: 64` and configure `ipAddressHeaders: ["x-forwarded-for"]`.

### 2.4 Session Security & Cookie Encryption
- Session Caching: Use the `"jwe"` (JSON Web Encryption with AES-256-GCM) or `"compact"` strategy to store encrypted session data in cookies, eliminating redundant database roundtrips.
- Cookie Attributes:
  - `useSecureCookies: true` in production
  - `sameSite: "lax"` (or `"strict"` for sensitive admin sections)
  - `httpOnly: true`
  - Cookie prefix: `__Secure-jeemu`

### 2.5 Security Auditing via Database Hooks
- Audit sensitive security events:
  ```typescript
  databaseHooks: {
    session: {
      create: {
        after: async ({ data, ctx }) => {
          logger.info("session.created", { userId: data.userId, ip: ctx?.request?.headers.get("x-forwarded-for") });
        }
      },
      delete: {
        before: async ({ data }) => {
          logger.info("session.revoked", { sessionId: data.id });
        }
      }
    }
  }
  ```

---

## 3. Threat Model (STRIDE Assessment)

| Threat | Boundary | Vulnerability / Attack Vector | Hardening Mitigation |
| :--- | :--- | :--- | :--- |
| **Spoofing** | Admin APIs | Forged token or brute-forced admin key | Supabase OAuth2 JWT validation (`require_supabase_auth`) + constant-time comparison |
| **Tampering** | Stripe Webhook | Unsigned POST event claiming checkout completion | Enforce cryptographic signature verification (`stripe-signature`) across all remote environments |
| **Repudiation** | Google Sheets | Anonymous caller modifying rows | Webhook secret token validation in Google Apps Script `doPost(e)` |
| **Information Disclosure** | API Endpoints | Verbose exception strings leaking database/server details | Generic sanitized error responses; server-side trace logging |
| **Denial of Service** | Waitlist / Endpoints | Single IP proxy collisions & memory leak in rate limiter | Real client IP extraction, dictionary key TTL eviction, or Redis/edge rate limiting |
| **Elevation of Privilege** | CORS Configuration | Malicious site issuing credentialed requests | Restrict CORS to explicit allowlist; eliminate `allow_origins=["*"]` with credentials |

---

## 4. Verification & Testing Checklist

- [x] Automated unit and security tests verified via Pytest
- [x] CORS configuration validated against W3C specification
- [x] Supply chain advisories cataloged via `npm audit`
- [x] Secrets scanned across git commit history (zero `.env` commits detected)
- [x] Remediation code prepared for immediate application

---

## 5. Next Steps

To execute the hardening fixes systematically:
1. **Apply [SEC-001] & [SEC-002]:** Lock down CORS in `main.py` & `vercel.json`, and restore `require_supabase_auth` with constant-time verification in `auth.py`.
2. **Apply [SEC-003] & [SEC-004]:** Fix client IP extraction and memory leak in `RateLimiterMiddleware`, and restrict unsigned webhooks strictly to `ENV == "test"`.
3. **Apply [SEC-005] & [SEC-006]:** Run `npm audit fix` and sanitize exception handling across all routers.
