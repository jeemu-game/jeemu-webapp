"""Health check router."""

import time
from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "jeemu-api",
        "platform": "fastapi-python",
        "timestamp": int(time.time() * 1000),
    }
