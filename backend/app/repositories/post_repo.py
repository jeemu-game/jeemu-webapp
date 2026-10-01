"""Post Repository Protocol."""

from typing import Any, Dict, List, Optional, Protocol, runtime_checkable


@runtime_checkable
class PostRepositoryProtocol(Protocol):
    async def get_posts(self) -> Dict[str, List[Dict[str, Any]]]: ...

    async def create_post(self, category: str, post_data: Dict[str, Any]) -> Dict[str, Any]: ...

    async def react_to_post(
        self, category: str, post_id: str, reaction_type: str
    ) -> Optional[Dict[str, Any]]: ...
