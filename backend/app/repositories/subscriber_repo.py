"""Subscriber Repository Protocol."""

from typing import Any, Protocol, runtime_checkable


@runtime_checkable
class SubscriberRepositoryProtocol(Protocol):
    async def get_subscriber_count(self) -> int: ...

    async def get_subscribers(self) -> list[dict[str, Any]]: ...

    async def find_by_email(self, email: str) -> dict[str, Any] | None: ...

    async def find_by_referral_code(self, code: str) -> dict[str, Any] | None: ...

    async def create_subscriber(
        self, email: str, name: str = "Backer", ref: str | None = None
    ) -> dict[str, Any]: ...

    async def mark_subscriber_vip(
        self,
        subscriber_id: str | None = None,
        referral_code: str | None = None,
        email: str | None = None,
        amount: float = 1.0,
        stripe_session_id: str | None = None,
        stripe_payment_intent: str | None = None,
    ) -> dict[str, Any]: ...

    async def increment_referral_count(self, referral_code: str) -> dict[str, Any] | None: ...

    async def unsubscribe_user(self, email: str) -> dict[str, Any] | None: ...

    async def resubscribe_user(self, email: str) -> dict[str, Any] | None: ...
