"""Post Repository Protocol."""

from typing import Any, Protocol, runtime_checkable


@runtime_checkable
class PostRepositoryProtocol(Protocol):
    async def get_posts(self) -> dict[str, list[dict[str, Any]]]: ...

    async def create_post(self, category: str, post_data: dict[str, Any]) -> dict[str, Any]: ...

    async def react_to_post(
        self, category: str, post_id: str, reaction_type: str
    ) -> dict[str, Any] | None: ...
