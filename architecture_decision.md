# Jeemu Backend Migration — Grilling Decision Record

## Decision: Decouple Backend into a Deep Python FastAPI Module

### Crystallized Decisions

| Decision | Choice |
|---|---|
| **Route scope** | All 14 routes move to Python — clean break |
| **Docker topology** | Docker Compose: `frontend` (Node/Vite or nginx) + `backend` (FastAPI/uvicorn) |
| **Database** | Keep Supabase cloud, but behind a swappable repository seam |
| **DB library** | SQLAlchemy + Alembic migrations (works with any Postgres) |
| **Email** | Full Python rewrite — smtplib + Jinja2 templates (drop Nodemailer) |
| **Tests** | Fresh pytest suite with FastAPI TestClient (in-process, no network) |
| **Structure** | Layered: `routers/` → `modules/` → `repositories/` → `adapters/` |
| **Migration** | Big bang: build complete Python backend, swap at once |

### Ported Modules (all 6)

- ✅ Google Sheets webhook sync
- ✅ Stripe webhook handler
- ✅ Referral security / anti-fraud (canonicalizeEmail, isSelfReferral, processVipReferralCredit)
- ✅ Unsubscribe HMAC token system
- ✅ Local JSON fallback (as repository adapter)
- ✅ Telemetry event logging and metrics

### Target Directory Structure

```
backend/
├── Dockerfile
├── pyproject.toml
├── alembic.ini
├── alembic/
│   └── versions/
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI app, CORS, middleware
│   ├── config.py                # Pydantic Settings (env vars)
│   ├── routers/
│   │   ├── health.py            # GET /api/health
│   │   ├── waitlist.py          # GET /api/waitlist/count
│   │   ├── subscribers.py       # POST /api/subscribers, GET, PATCH
│   │   ├── stripe_routes.py     # POST /api/stripe/create-session, webhook
│   │   ├── unsubscribe.py       # GET /api/unsubscribe, POST /api/resubscribe
│   │   ├── admin.py             # CSV export, SMTP status, test email, batch sync
│   │   └── telemetry.py         # POST /api/telemetry/event, GET /metrics, SSE stream
│   ├── modules/
│   │   ├── backer_intake.py     # Signup orchestration (honeypot, dedup, referral, email, sheets)
│   │   ├── vip_deposit.py       # VIP upgrade + referral credit (consolidates duplicated logic)
│   │   ├── referral_security.py # canonicalizeEmail, isSelfReferral, processVipReferralCredit
│   │   └── telemetry.py         # Event logging, metrics aggregation, funnel computation
│   ├── repositories/
│   │   ├── base.py              # Abstract repository interface (Protocol)
│   │   ├── subscriber_repo.py   # Subscriber CRUD interface
│   │   ├── telemetry_repo.py    # Telemetry event interface
│   │   └── post_repo.py         # Posts (feed, chaos, journey) interface
│   ├── adapters/
│   │   ├── postgres.py          # SQLAlchemy adapter (Supabase / self-hosted)
│   │   ├── json_file.py         # Local JSON file adapter (dev/offline)
│   │   ├── smtp_email.py        # Hostinger SMTP via smtplib
│   │   ├── resend_email.py      # Resend API fallback
│   │   ├── stripe_adapter.py    # Stripe SDK wrapper
│   │   └── google_sheets.py     # Webhook sync adapter
│   ├── models/
│   │   ├── subscriber.py        # SQLAlchemy + Pydantic models
│   │   ├── telemetry_event.py
│   │   └── post.py
│   └── templates/
│       ├── signup_confirmation.html    # Jinja2 email templates
│       ├── referral_milestone.html
│       ├── vip_deposit_receipt.html
│       └── unsubscribe_page.html
├── tests/
│   ├── conftest.py              # TestClient fixture, JSON adapter for isolation
│   ├── test_health.py
│   ├── test_subscribers.py
│   ├── test_stripe.py
│   ├── test_referral_security.py
│   ├── test_email.py
│   ├── test_unsubscribe.py
│   └── test_vip_deposit.py
└── data/
    └── jeemu.db.json            # Local fallback data (moved from root)

frontend/
├── Dockerfile
├── package.json
├── vite.config.js
├── index.html
├── public/
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── components/          # (unchanged React components)
│   ├── css/
│   ├── data/                # (unchanged static display data)
│   └── js/                  # (unchanged client JS)
└── nginx.conf               # Production: serve dist/ + proxy /api to backend

docker-compose.yml
```

### Key Architectural Wins

1. **Locality**: `src/lib/supabase.js` (749 lines of server code in client dir) is deleted entirely
2. **Leverage**: 15 conditional `isSupabaseConfigured` branches replaced by one adapter selection at startup
3. **Interface**: Pydantic models validate every request/response; OpenAPI docs auto-generated
4. **Tests**: pytest TestClient runs in-process — no localhost network dependency
5. **Consolidation**: VIP referral credit logic (duplicated at api/index.js L258 and L374) merged into `vip_deposit.py`
6. **Seam**: Repository Protocol makes swapping Supabase → self-hosted Postgres a config change

### What the Node Frontend Loses

- `src/lib/supabase.js` — deleted (server-only code that never belonged in src/)
- `api/` directory — deleted entirely
- `server.js` — deleted (replaced by Docker Compose)
- `tests/test_api.py` — replaced by new pytest suite
- `tests/referral_security.test.js` — replaced by `test_referral_security.py`
- `tests/email_and_sheets.test.js` — replaced by `test_email.py`
- `tests/api_integration.test.js` — replaced by new integration tests

### What the Node Frontend Keeps

- All React components (unchanged)
- `src/js/` client-side scripts (funnel.js, analytics.js, etc.)
- `src/data/` static display data
- `src/css/` and `src/index.css`
- Vite build pipeline
- `src/js/subdomains.js` (admin dashboard — creates its own Supabase realtime client)
