"""Telemetry Repository Protocol."""

from typing import Any, Dict, List, Optional, Protocol, runtime_checkable


@runtime_checkable
class TelemetryRepositoryProtocol(Protocol):
    async def log_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]: ...

    async def get_metrics(self) -> Dict[str, Any]: ...

    async def get_recent_events(self, limit: int = 50) -> List[Dict[str, Any]]: ...
