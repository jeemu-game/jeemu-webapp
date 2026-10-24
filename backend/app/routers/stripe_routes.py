"""Stripe Checkout & Webhook router."""

import json
from typing import Optional
from fastapi import APIRouter, Header, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from app.adapters.stripe_adapter import StripeAdapter
from app.config import settings
from app.modules.vip_deposit import VipDepositService

router = APIRouter(tags=["stripe"])


class CreateSessionRequest(BaseModel):
    subscriberId: Optional[str] = None
    referralCode: Optional[str] = None
    email: Optional[str] = None


@router.post("/stripe/create-session")
async def create_session(payload: CreateSessionRequest):
    adapter = StripeAdapter()
    res = await adapter.create_checkout_session(
        subscriber_id=payload.subscriberId,
        referral_code=payload.referralCode,
        email=payload.email,
    )
    if res.get("mode") in ("disabled", "unavailable"):
        return JSONResponse(status_code=503, content=res)
    return res


@router.post("/stripe/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None, alias="stripe-signature"),
):
    raw_body = await request.body()
    adapter = StripeAdapter()
    event_data = None

    if adapter.is_configured() and adapter.webhook_secret:
        # Real deployments: the event MUST carry a valid Stripe signature.
        if not stripe_signature:
            raise HTTPException(status_code=400, detail="Missing Stripe signature")
        try:
            event_data = adapter.construct_event(raw_body, stripe_signature)
        except Exception as e:
            print(f"Stripe webhook signature verification failed: {e}")
            raise HTTPException(status_code=400, detail="Invalid Stripe signature")
    elif settings.ENV in ("test", "development"):
        # Local/dev/test only: accept unsigned JSON so the flow can be exercised without Stripe.
        try:
            event_data = json.loads(raw_body.decode("utf-8"))
        except Exception:
            event_data = {}
    else:
        # Production without a webhook secret: refuse, never trust unsigned payment events.
        raise HTTPException(status_code=503, detail="Webhook not configured")

    event_type = event_data.get("type") if isinstance(event_data, dict) else getattr(event_data, "type", None)
    if event_type == "checkout.session.completed":
        session = event_data.get("data", {}).get("object", {}) if isinstance(event_data, dict) else event_data.data.object
        metadata = session.get("metadata", {}) if isinstance(session, dict) else getattr(session, "metadata", {}) or {}
        subscriber_id = metadata.get("subscriber_id")
        referral_code = metadata.get("referral_code")
        customer_email = (
            session.get("customer_email")
            or (session.get("customer_details") or {}).get("email")
            if isinstance(session, dict)
            else getattr(session, "customer_email", None)
        )
        payment_intent_id = (
            session.get("payment_intent")
            if isinstance(session, dict)
            else getattr(session, "payment_intent", None)
        )
        session_id = session.get("id") if isinstance(session, dict) else getattr(session, "id", None)
        total_cents = session.get("amount_total") if isinstance(session, dict) else getattr(session, "amount_total", None)
        amount_charged = (total_cents / 100.0) if total_cents else settings.DEPOSIT_AMOUNT_CENTS / 100.0

        vip_service = VipDepositService()
        try:
            await vip_service.handle_vip_deposit(
                subscriber_id=subscriber_id,
                referral_code=referral_code,
                email=customer_email,
                amount=amount_charged,
                stripe_session_id=session_id,
                stripe_payment_intent=payment_intent_id,
            )
        except Exception as e:
            print(f"Error processing checkout.session.completed webhook: {e}")

    return {"received": True}
