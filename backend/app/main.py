"""FastAPI Main Application for Jeemu Tabletop Console."""

import time
from collections import defaultdict
from typing import Dict, List, Tuple
from fastapi import FastAPI, Request, Response, status
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
    """Enforces rate limiting and injects RateLimit-* headers."""

    def __init__(self, app):
        super().__init__(app)
        # client_ip -> list of timestamps
        self.history: Dict[Tuple[str, str], List[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "127.0.0.1"
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
        # Purge expired timestamps
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
        return response


from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("\n======================================================")
    print("🚀 JEEMU FASTAPI BACKEND LIVE!")
    print(f"👉 http://{settings.HOST}:{settings.PORT}")
    print("------------------------------------------------------")
    print(f"Data Adapter: {settings.DATA_ADAPTER}")
    print("API endpoints:")
    print(" • GET  /api/health")
    print(" • GET  /api/waitlist/count")
    print(" • POST /api/subscribers")
    print(" • POST /api/stripe/create-session")
    print(" • GET  /api/telemetry/metrics")
    print(" • GET  /docs (OpenAPI Swagger UI)")
    print("======================================================\n")
    yield


app = FastAPI(
    title="Jeemu API",
    version="1.0.0",
    description="Jeemu Tabletop Console Backend API & Real-time Platform",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate Limiting
app.add_middleware(RateLimiterMiddleware)

# Mount routers with both /api and root prefix for backwards compatibility
routers = [
    health_router,
    waitlist_router,
    subscribers_router,
    stripe_router,
    unsubscribe_router,
    admin_router,
    telemetry_router,
]

for r in routers:
    app.include_router(r, prefix="/api")
    app.include_router(r)

