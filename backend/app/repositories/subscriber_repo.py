"""Subscriber Repository Protocol."""

from typing import Any, Dict, List, Optional, Protocol, runtime_checkable


@runtime_checkable
class SubscriberRepositoryProtocol(Protocol):
    async def get_subscriber_count(self) -> int: ...

    async def get_subscribers(self) -> List[Dict[str, Any]]: ...

    async def find_by_email(self, email: str) -> Optional[Dict[str, Any]]: ...

    async def find_by_referral_code(self, code: str) -> Optional[Dict[str, Any]]: ...

    async def create_subscriber(
        self, email: str, name: str = "Backer", ref: Optional[str] = None
    ) -> Dict[str, Any]: ...

    async def mark_subscriber_vip(
        self,
        subscriber_id: Optional[str] = None,
        referral_code: Optional[str] = None,
        email: Optional[str] = None,
        amount: float = 1.0,
        stripe_session_id: Optional[str] = None,
        stripe_payment_intent: Optional[str] = None,
    ) -> Dict[str, Any]: ...

    async def increment_referral_count(self, referral_code: str) -> Optional[Dict[str, Any]]: ...

    async def unsubscribe_user(self, email: str) -> Optional[Dict[str, Any]]: ...

    async def resubscribe_user(self, email: str) -> Optional[Dict[str, Any]]: ...
