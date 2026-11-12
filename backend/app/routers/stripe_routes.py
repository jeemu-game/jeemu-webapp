"""Stripe Checkout & Webhook router."""

import json
import re

from fastapi import APIRouter, Header, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.adapters import get_adapter
from app.adapters.stripe_adapter import StripeAdapter
from app.config import settings
from app.modules.vip_deposit import VipDepositService

router = APIRouter(tags=["stripe"])


class CreateSessionRequest(BaseModel):
    subscriberId: str | None = None
    referralCode: str | None = None
    email: str | None = None


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


def _field(obj, key):
    """Read a field from a Stripe object or a plain dict."""
    if obj is None:
        return None
    if isinstance(obj, dict):
        return obj.get(key)
    return getattr(obj, key, None)


_SESSION_ID = re.compile(r"cs_(test|live)_[A-Za-z0-9]{8,190}")


@router.get("/stripe/checkout-status")
async def checkout_status(session_id: str = Query(..., max_length=200)):
    """Used by the thank-you page after a $1 VIP payment (Payment Link redirect: /?vip=thanks&session_id={CHECKOUT_SESSION_ID}).

    Only the payer's browser holds the unguessable Checkout Session id, so this is how the page knows the visitor really paid. It asks Stripe,
    never trusts the URL alone, and returns just whether it is paid and the referral code of the subscriber the payment was matched to
    (no email, no payment details). Without STRIPE_SECRET_KEY it answers 503 and the page shows a plain thank-you.
    """
    if not _SESSION_ID.fullmatch(session_id):
        return JSONResponse(status_code=400, content={"paid": False})
    adapter = StripeAdapter()
    if not adapter.is_configured():
        return JSONResponse(status_code=503, content={"paid": False, "error": "unavailable"})
    try:
        session = await adapter.retrieve_session(session_id)
    except Exception as e:
        print(f"Stripe session lookup failed: {e}")
        return {"paid": False}
    if _field(session, "payment_status") != "paid":
        return {"paid": False}
    email = _field(session, "customer_email") or _field(
        _field(session, "customer_details"), "email"
    )
    ref = _field(session, "client_reference_id") or _field(
        _field(session, "metadata"), "referral_code"
    )
    repo = get_adapter()
    sub = (await repo.find_by_email(email) if email else None) or (
        await repo.find_by_referral_code(ref) if ref else None
    )
    if not sub:
        return {"paid": True, "vip": False}
    # the webhook may not have been processed yet when the browser arrives: the page retries for a few seconds
    return {
        "paid": True,
        "vip": bool(sub.get("isVip")),
        "referralCode": sub.get("referralCode") if sub.get("isVip") else None,
    }


@router.post("/stripe/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str | None = Header(None, alias="stripe-signature"),
):
    raw_body = await request.body()
    adapter = StripeAdapter()
    event_data = None

    if adapter.webhook_secret:
        # Real deployments: the event MUST carry a valid Stripe signature (only the webhook secret is needed to check it).
        if not stripe_signature:
            raise HTTPException(status_code=400, detail="Missing Stripe signature")
        try:
            adapter.construct_event(
                raw_body, stripe_signature
            )  # raises unless the signature is genuine
        except Exception as e:
            print(f"Stripe webhook signature verification failed: {e}")
            raise HTTPException(status_code=400, detail="Invalid Stripe signature") from e
    elif settings.ENV == "test":
        pass  # Strictly test harness only: accept unsigned JSON so tests can exercise the flow.
    else:
        # Production without a webhook secret: refuse, never trust unsigned payment events.
        raise HTTPException(status_code=503, detail="Webhook not configured")

    # Work on a plain dict: current Stripe libraries return objects that are not dicts (.get() fails on them). The body is only parsed after
    # the signature has been verified above.
    try:
        event_data = json.loads(raw_body.decode("utf-8"))
    except Exception:
        event_data = {}
    if not isinstance(event_data, dict):
        event_data = {}

    if event_data.get("type") != "checkout.session.completed":
        return {"received": True}
    session = (event_data.get("data") or {}).get("object") or {}
    pay_status = session.get("payment_status")
    # Only a paid session upgrades anyone (a card that is still pending or failed also produces this event)
    if pay_status is not None and pay_status != "paid":
        print(
            f"Stripe webhook: ignoring checkout.session.completed with payment_status={pay_status}"
        )
        return {"received": True}
    metadata = session.get("metadata") or {}
    customer_email = session.get("customer_email") or (session.get("customer_details") or {}).get(
        "email"
    )
    # Payment Links (the $1 VIP button on the site) carry the buyer's referral code as client_reference_id
    referral_code = metadata.get("referral_code") or session.get("client_reference_id")
    total_cents = session.get("amount_total")
    amount_charged = (total_cents / 100.0) if total_cents else settings.DEPOSIT_AMOUNT_CENTS / 100.0

    print(
        f"Stripe webhook: paid session {session.get('id')} email={customer_email!r} ref={referral_code!r}"
    )
    try:
        result = await VipDepositService().handle_vip_deposit(
            subscriber_id=metadata.get("subscriber_id"),
            referral_code=referral_code,
            email=customer_email,
            amount=amount_charged,
            stripe_session_id=session.get("id"),
            stripe_payment_intent=session.get("payment_intent"),
        )
    except Exception as e:
        # Fail loudly: a non-2xx makes Stripe retry for days instead of silently losing a paid VIP.
        print(f"Stripe webhook: could not record the payment: {e!r}")
        raise HTTPException(status_code=500, detail="Could not record the payment") from e
    if not (result or {}).get("subscriber"):
        print(
            f"Stripe webhook: PAID BUT NO MATCHING SUBSCRIBER (email={customer_email!r} ref={referral_code!r}); needs a manual look"
        )
    return {"received": True}
