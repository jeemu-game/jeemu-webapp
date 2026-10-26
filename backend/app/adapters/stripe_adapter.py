import asyncio
from typing import Any

import stripe

from app.config import settings


class StripeAdapter:
    def __init__(self):
        self.secret_key = settings.STRIPE_SECRET_KEY
        self.webhook_secret = settings.STRIPE_WEBHOOK_SECRET
        self.payment_link = settings.STRIPE_PAYMENT_LINK
        if self.secret_key:
            stripe.api_key = self.secret_key

    def is_configured(self) -> bool:
        return bool(self.secret_key)

    async def create_checkout_session(
        self,
        subscriber_id: str | None = None,
        referral_code: str | None = None,
        email: str | None = None,
    ) -> dict[str, Any]:
        if not settings.DEPOSIT_ENABLED:
            return {"mode": "disabled", "error": "Deposits are not open yet."}

        if not self.is_configured():
            # Only fall back to a payment link if one was explicitly configured for THIS account.
            if self.payment_link:
                return {"mode": "redirect", "url": self.payment_link}
            return {"mode": "unavailable", "error": "Payments are not configured."}

        try:
            base_url = settings.SITE_URL.rstrip("/")
            session_params: dict[str, Any] = {
                "payment_method_types": ["card"],
                "mode": "payment",
                "line_items": [
                    {
                        "price_data": {
                            "currency": "usd",
                            "unit_amount": settings.DEPOSIT_AMOUNT_CENTS,
                            "product_data": {
                                "name": settings.DEPOSIT_PRODUCT_NAME,
                                "description": settings.DEPOSIT_DESCRIPTION,
                            },
                        },
                        "quantity": 1,
                    }
                ],
                "metadata": {
                    "subscriber_id": (subscriber_id or "")[:50],
                    "referral_code": (referral_code or "")[:20],
                    "source": "jeemu_deposit_step",
                },
                "success_url": f"{base_url}/?deposit=success#waitlist",
                "cancel_url": f"{base_url}/?deposit=cancelled#waitlist",
            }
            if email:
                session_params["customer_email"] = email.strip()[:120]

            session = await asyncio.to_thread(stripe.checkout.Session.create, **session_params)
            return {"mode": "checkout", "url": session.url, "sessionId": session.id}
        except Exception as e:
            print(f"Stripe session creation failed: {e}")
            if self.payment_link:
                return {"mode": "redirect", "url": self.payment_link}
            return {"mode": "unavailable", "error": "Could not start checkout. Please try again."}

    def construct_event(self, payload: bytes, sig_header: str) -> Any:
        if not self.webhook_secret:
            raise ValueError("STRIPE_WEBHOOK_SECRET is not configured.")
        return stripe.Webhook.construct_event(payload, sig_header, self.webhook_secret)
