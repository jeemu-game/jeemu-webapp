"""Stripe SDK Wrapper Adapter."""

from typing import Any, Dict, Optional
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
        subscriber_id: Optional[str] = None,
        referral_code: Optional[str] = None,
        email: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not self.is_configured():
            return {
                "mode": "redirect",
                "url": self.payment_link,
                "message": "Using configured Stripe Early Bird payment link",
            }

        try:
            base_url = settings.SITE_URL.rstrip("/")
            session_params: Dict[str, Any] = {
                "payment_method_types": ["card"],
                "mode": "payment",
                "line_items": [
                    {
                        "price_data": {
                            "currency": "usd",
                            "unit_amount": 100,  # $1.00 deposit
                            "product_data": {
                                "name": "Jeemu Early Bird VIP Deposit",
                                "description": (
                                    "100% refundable $1 deposit. Guarantees 45% Kickstarter discount "
                                    "($89 vs $159) + Free Gold-Stamped Founder Block."
                                ),
                                "images": [f"{base_url}/images/jeemu-hero.jpg"],
                            },
                        },
                        "quantity": 1,
                    }
                ],
                "metadata": {
                    "subscriber_id": (subscriber_id or "")[:50],
                    "referral_code": (referral_code or "")[:20],
                    "source": "jeemu_redesign_funnel",
                },
                "success_url": f"{base_url}/?vip_success=1&ref={referral_code or ''}#pricing",
                "cancel_url": f"{base_url}/?vip_cancelled=1#pricing",
            }
            if email:
                session_params["customer_email"] = email.strip()[:120]

            session = stripe.checkout.Session.create(**session_params)
            return {"mode": "checkout", "url": session.url, "sessionId": session.id}
        except Exception as e:
            print(f"⚠️ Stripe session creation fallback to payment link: {e}")
            return {"mode": "redirect", "url": self.payment_link}

    def construct_event(self, payload: bytes, sig_header: str) -> Any:
        if not self.webhook_secret:
            raise ValueError("STRIPE_WEBHOOK_SECRET is not configured.")
        return stripe.Webhook.construct_event(payload, sig_header, self.webhook_secret)
