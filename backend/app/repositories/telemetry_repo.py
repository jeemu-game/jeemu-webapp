"""Telemetry Repository Protocol."""

from typing import Any, Protocol, runtime_checkable


@runtime_checkable
class TelemetryRepositoryProtocol(Protocol):
    async def log_event(self, event_data: dict[str, Any]) -> dict[str, Any]: ...

    async def get_metrics(self) -> dict[str, Any]: ...

    async def get_recent_events(self, limit: int = 50) -> list[dict[str, Any]]: ...
