"""Telemetry & Realtime Analytics Router."""

from typing import Any, Dict
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from app.adapters import get_adapter
from app.models.telemetry_event import TelemetryEventCreate
from app.modules.telemetry import TelemetryService

router = APIRouter(tags=["telemetry"])


@router.post("/telemetry/event")
async def record_telemetry_event(payload: TelemetryEventCreate):
    service = TelemetryService()
    event_dict = payload.model_dump(by_alias=True, exclude_unset=True)
    stored = await service.record_event(event_dict)
    return {"success": True, "event": stored}


@router.get("/telemetry/metrics")
@router.get("/metrics")
async def get_metrics():
    service = TelemetryService()
    metrics = await service.get_metrics()
    return metrics


@router.get("/telemetry/stream")
async def telemetry_stream():
    service = TelemetryService()
    return StreamingResponse(
        service.sse_event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# Community Posts & Reactions (for frontend dashboard & social feed)

class ReactRequest(BaseModel):
    reactionType: str = "rip"


@router.get("/posts")
async def get_posts():
    adapter = get_adapter()
    return await adapter.get_posts()


@router.post("/posts/{category}")
async def create_post(category: str, post_data: Dict[str, Any]):
    adapter = get_adapter()
    return await adapter.create_post(category, post_data)


@router.post("/posts/{category}/{post_id}/react")
async def react_to_post(category: str, post_id: str, payload: ReactRequest):
    adapter = get_adapter()
    updated = await adapter.react_to_post(category, post_id, payload.reactionType)
    return {"success": bool(updated), "post": updated}
