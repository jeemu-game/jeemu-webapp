"""FastAPI Main Application for Jeemu Tabletop Console."""

import time
from collections import defaultdict
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings
from app.routers import (
    admin_router,
    health_router,
    stripe_router,
    subscribers_router,
    telemetry_router,
    unsubscribe_router,
    waitlist_router,
)


class RateLimiterMiddleware(BaseHTTPMiddleware):
    """Enforces rate limiting with real proxy IP extraction and automatic memory pruning."""

    def __init__(self, app):
        super().__init__(app)
        # (client_ip, bucket) -> list of timestamps
        self.history: dict[tuple[str, str], list[float]] = defaultdict(list)
        self.last_cleanup: float = time.time()

    async def dispatch(self, request: Request, call_next):
        # 1. Real client IP extraction behind trusted proxies (Vercel / Cloudflare)
        forwarded_for = request.headers.get("x-forwarded-for")
        real_ip = request.headers.get("x-real-ip")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        elif real_ip:
            client_ip = real_ip.strip()
        elif request.client:
            client_ip = request.client.host
        else:
            client_ip = "127.0.0.1"

        path = request.url.path
        method = request.method
        now = time.time()

        is_test = settings.ENV == "test"

        # Determine limits based on route
        if method == "POST" and ("subscribers" in path):
            bucket = "waitlist_write"
            window = 300.0  # 5 min
            limit = 100 if is_test else 50
        elif method == "POST" and ("stripe" in path and "create-session" in path):
            bucket = "stripe_session"
            window = 300.0
            limit = 100 if is_test else 15
        else:
            bucket = "general_read"
            window = 60.0  # 1 min
            limit = 300 if is_test else 60

        key = (client_ip, bucket)

        # 2. Periodic dictionary key pruning to prevent unbounded memory growth
        if now - self.last_cleanup > 120.0:
            self.last_cleanup = now
            stale_keys = [
                k
                for k, ts_list in self.history.items()
                if not ts_list or (now - ts_list[-1]) > 300.0
            ]
            for k in stale_keys:
                del self.history[k]

        # Purge expired timestamps for current key
        self.history[key] = [t for t in self.history[key] if now - t < window]

        remaining = max(0, limit - len(self.history[key]))
        if len(self.history[key]) >= limit:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"error": "Too many requests. Please slow down."},
                headers={
                    "RateLimit-Limit": str(limit),
                    "RateLimit-Remaining": "0",
                    "RateLimit-Reset": str(int(window)),
                },
            )

        # Record this request
        self.history[key].append(now)
        remaining = max(0, limit - len(self.history[key]))

        response: Response = await call_next(request)
        response.headers["RateLimit-Limit"] = str(limit)
        response.headers["RateLimit-Remaining"] = str(remaining)
        response.headers["RateLimit-Reset"] = str(int(window))
        response.headers["X-API-Version"] = "v1"
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Injects defensive HTTP security headers into all responses."""

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("\n======================================================")
    print(">> JEEMU FASTAPI BACKEND LIVE!")
    print(f"-> http://{settings.HOST}:{settings.PORT}")
    print("------------------------------------------------------")
    print(f"Data Adapter: {settings.DATA_ADAPTER}")
    print("API Canonical Version: /api/v1")
    print("======================================================\n")
    yield


is_dev = settings.ENV in ("development", "dev", "test")

app = FastAPI(
    title="Jeemu API",
    version="1.0.0",
    description="Jeemu Tabletop Console Backend API & Real-time Platform",
    docs_url="/docs" if is_dev else None,
    redoc_url="/redoc" if is_dev else None,
    openapi_url="/openapi.json" if is_dev else None,
    lifespan=lifespan,
)

# Defensive Security Headers
app.add_middleware(SecurityHeadersMiddleware)

# Explicit CORS Origins (never wildcard with credentials)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Rate Limiting
app.add_middleware(RateLimiterMiddleware)

# All application routers
routers = [
    health_router,
    waitlist_router,
    subscribers_router,
    stripe_router,
    unsubscribe_router,
    admin_router,
    telemetry_router,
]

# ------------------------------------------------------------------------------
# API Versioning: Canonical /api/v1 routes
# ------------------------------------------------------------------------------
v1_router = APIRouter(prefix="/v1")
for r in routers:
    v1_router.include_router(r)

app.include_router(v1_router, prefix="/api")


@app.get("/api/version", tags=["version"])
@app.get("/api/v1/version", tags=["version"])
async def get_version():
    return {
        "apiVersion": "v1",
        "release": "1.0.0",
        "canonicalPrefix": "/api/v1",
        "supportedVersions": ["v1"],
        "deprecatedVersions": [],
        "status": "stable",
    }


# Backward compatibility mounts for legacy /api/* and root /* callers
for r in routers:
    app.include_router(r, prefix="/api")
    app.include_router(r)
