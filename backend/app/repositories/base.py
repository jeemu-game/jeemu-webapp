"""Base repository protocol definitions."""

from typing import Any, Dict, List, Optional, Protocol, runtime_checkable


@runtime_checkable
class BaseRepository(Protocol):
    """Marker protocol for repositories."""
    pass
