"""Telemetry Event Processing, Metrics Aggregation, & Live SSE Broadcasting."""

import asyncio
import json
from collections.abc import AsyncGenerator
from typing import Any

from app.adapters import get_adapter


class TelemetryBroadcaster:
    def __init__(self):
        self._subscribers: set[asyncio.Queue] = set()

    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue()
        self._subscribers.add(q)
        return q

    def unsubscribe(self, q: asyncio.Queue) -> None:
        self._subscribers.discard(q)

    async def broadcast(self, event_type: str, data: dict[str, Any]) -> None:
        message = json.dumps({"type": event_type, "event": data})
        for q in list(self._subscribers):
            try:
                q.put_nowait(message)
            except Exception:
                self._subscribers.discard(q)


broadcaster = TelemetryBroadcaster()


class TelemetryService:
    def __init__(self, repository=None):
        self.repo = repository or get_adapter()

    async def record_event(self, event_data: dict[str, Any]) -> dict[str, Any]:
        stored_event = await self.repo.log_event(event_data)
        # Broadcast to live dashboard SSE listeners
        await broadcaster.broadcast("telemetry_event", stored_event)
        return stored_event

    async def get_metrics(self) -> dict[str, Any]:
        return await self.repo.get_metrics()

    async def sse_event_stream(self) -> AsyncGenerator[str, None]:
        q = broadcaster.subscribe()
        try:
            # Yield initial connection heartbeat
            yield f"event: connected\ndata: {json.dumps({'status': 'connected'})}\n\n"
            while True:
                try:
                    data = await asyncio.wait_for(q.get(), timeout=20.0)
                    yield f"event: message\ndata: {data}\n\n"
                except TimeoutError:
                    # Keep-alive comment
                    yield ": keepalive\n\n"
        finally:
            broadcaster.unsubscribe(q)
