"""Base repository protocol definitions."""

from typing import Protocol, runtime_checkable


@runtime_checkable
class BaseRepository(Protocol):
    """Marker protocol for repositories."""

    pass
