"""Waitlist count router."""

from fastapi import APIRouter

from app.adapters import get_adapter

router = APIRouter(tags=["waitlist"])


@router.get("/waitlist/count")
async def get_waitlist_count():
    try:
        adapter = get_adapter()
        count = await adapter.get_subscriber_count()
        real_count = int(count or 0)
        return {"count": real_count, "rawCount": real_count}
    except Exception as e:
        # The reason goes to the server logs only; the public response never carries exception text.
        print(f"Waitlist count error: {type(e).__name__}: {e}")
        return {"count": 0, "rawCount": 0, "error": "Unable to fetch waitlist count."}
