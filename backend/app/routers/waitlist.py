"""Waitlist count router."""

from fastapi import APIRouter
from app.adapters import get_adapter

router = APIRouter(tags=["waitlist"])


@router.get("/waitlist/count")
async def get_waitlist_count():
    adapter = get_adapter()
    try:
        raw_count = await adapter.get_subscriber_count()
        display_count = max(raw_count or 0, 1848)
        return {"count": display_count, "rawCount": raw_count}
    except Exception as e:
        print(f"Waitlist count error: {e}")
        return {"count": 1848, "rawCount": 0}
