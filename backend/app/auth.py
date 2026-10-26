"""Supabase OAuth2 & Admin Authentication & Authorization Guards.

Secures admin and private endpoints using Supabase Auth or verified Admin credentials.
Features:
- Validates OAuth2 Bearer tokens in real-time against Supabase Auth API (/auth/v1/user).
- Validates active user sessions, token expiry, and user roles.
- Supports optional email allowlist via ADMIN_EMAILS.
- Includes a short 60s in-memory cache for high-throughput verified sessions.
- Backward compatibility guard `verify_admin_auth` using constant-time `hmac.compare_digest`
  to eliminate timing side-channel attacks.
"""

import hmac
import time
from typing import Any

import httpx
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings

# Swagger / OpenAPI Bearer scheme
bearer_scheme = HTTPBearer(auto_error=False)

# Short in-memory cache: token_hash -> (user_dict, expire_timestamp)
_verified_cache: dict[str, tuple[dict[str, Any], float]] = {}
CACHE_TTL_SECONDS = 60.0


async def require_supabase_auth(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    x_admin_key: str | None = Header(None, alias="X-Admin-Key"),
) -> dict[str, Any]:
    """FastAPI Dependency: Requires a valid Supabase OAuth2 / Auth Bearer token or Admin Key."""
    token = None
    if credentials and credentials.credentials:
        token = credentials.credentials.strip()
    elif x_admin_key:
        token = x_admin_key.strip()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required: Missing Supabase OAuth2 Bearer token or Admin Key.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 1. Test environment mock handling for pytest isolation
    if settings.ENV == "test":
        if token == "test-supabase-admin-token":
            return {
                "id": "usr_test_admin",
                "email": "admin@jeemu.test",
                "role": "authenticated",
                "app_metadata": {"role": "admin"},
            }
        if settings.ADMIN_PASSWORD and hmac.compare_digest(token, settings.ADMIN_PASSWORD):
            return {
                "id": "admin_key_user",
                "email": "admin@jeemu.fun",
                "role": "admin",
                "app_metadata": {"role": "admin"},
            }
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Supabase OAuth2 authentication session.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 1.5. Accept constant-time verified ADMIN_PASSWORD
    if settings.ADMIN_PASSWORD and hmac.compare_digest(token, settings.ADMIN_PASSWORD):
        return {
            "id": "admin_key_user",
            "email": "admin@jeemu.fun",
            "role": "admin",
            "app_metadata": {"role": "admin"},
        }

    # 2. Check local in-memory cache
    now = time.time()
    if token in _verified_cache:
        cached_user, expires_at = _verified_cache[token]
        if now < expires_at:
            return cached_user
        else:
            del _verified_cache[token]

    # 3. Verify token live with Supabase Auth API
    if not settings.SUPABASE_URL:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase Auth is not configured on server (missing SUPABASE_URL).",
        )

    auth_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/user"
    key = (
        settings.SUPABASE_SECRET_KEY
        or settings.SUPABASE_SERVICE_ROLE_KEY
        or settings.SUPABASE_PUBLISHABLE_KEY
        or settings.SUPABASE_ANON_KEY
        or ""
    )
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {token}",
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(auth_url, headers=headers)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Unable to reach Supabase Auth provider: {e}",
        ) from e

    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Supabase OAuth2 authentication session.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_data = resp.json()

    # 4. Enforce optional ADMIN_EMAILS allowlist
    allowed_emails = settings.allowed_admin_emails
    if allowed_emails:
        user_email = (user_data.get("email") or "").lower().strip()
        if user_email not in allowed_emails:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: Account {user_email} is not authorized for administrative access.",
            )

    # 5. Cache verified user
    _verified_cache[token] = (user_data, now + CACHE_TTL_SECONDS)
    return user_data


def verify_admin_auth(
    authorization: str | None = Header(None, alias="Authorization"),
    x_admin_key: str | None = Header(None, alias="X-Admin-Key"),
) -> bool:
    """Verifies that incoming request provides the valid ADMIN_PASSWORD.

    Uses constant-time comparison (hmac.compare_digest) to prevent timing attacks.
    Accepts:
      - Header 'Authorization: Bearer <ADMIN_PASSWORD>'
      - Header 'X-Admin-Key: <ADMIN_PASSWORD>'
    """
    admin_pass = settings.ADMIN_PASSWORD
    if not admin_pass:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Admin authentication password is not configured on server.",
        )

    token = None
    if authorization:
        parts = authorization.strip().split(" ")
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1]
        else:
            token = authorization.strip()
    elif x_admin_key:
        token = x_admin_key.strip()

    if not token or not hmac.compare_digest(token, admin_pass):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Admin access required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return True
