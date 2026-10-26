"""Routers package export."""

from app.routers.admin import router as admin_router
from app.routers.health import router as health_router
from app.routers.stripe_routes import router as stripe_router
from app.routers.subscribers import router as subscribers_router
from app.routers.telemetry import router as telemetry_router
from app.routers.unsubscribe import router as unsubscribe_router
from app.routers.waitlist import router as waitlist_router

__all__ = [
    "health_router",
    "waitlist_router",
    "subscribers_router",
    "stripe_router",
    "unsubscribe_router",
    "admin_router",
    "telemetry_router",
]
