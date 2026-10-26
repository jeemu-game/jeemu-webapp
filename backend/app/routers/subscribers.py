"""Subscribers router."""

from typing import Any

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse

from app.adapters import get_adapter
from app.auth import require_supabase_auth
from app.models.subscriber import (
    SubscriberCreateRequest,
    VipUpgradeRequest,
)
from app.modules.backer_intake import BackerIntakeService
from app.modules.vip_deposit import VipDepositService

router = APIRouter(tags=["subscribers"])


@router.post("/subscribers")
async def create_subscriber(payload: SubscriberCreateRequest):
    service = BackerIntakeService()
    status_code, response_data = await service.intake_backer(
        email=payload.email,
        name=payload.name,
        ref=payload.ref,
        hp_jeemu_check=payload.hp_jeemu_check,
    )
    return JSONResponse(status_code=status_code, content=response_data)


@router.get("/subscribers")
async def list_subscribers(_admin: dict[str, Any] = Depends(require_supabase_auth)):
    adapter = get_adapter()
    try:
        subscribers = await adapter.get_subscribers()
        return {"success": True, "subscribers": subscribers, "count": len(subscribers)}
    except Exception as e:
        print(f"Subscribers listing error: {e}")
        return JSONResponse(status_code=500, content={"error": "Failed to retrieve subscribers."})


@router.patch("/subscribers/{referral_code}/refer")
async def refer_subscriber(referral_code: str):
    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content={
            "error": "Referral milestone credits are strictly awarded upon verified $1 VIP Early Bird deposit payments."
        },
    )


@router.post("/subscribers/vip")
async def upgrade_subscriber_vip(
    payload: VipUpgradeRequest,
    _admin: dict[str, Any] = Depends(require_supabase_auth),
):
    service = VipDepositService()
    try:
        res = await service.handle_vip_deposit(
            subscriber_id=payload.subscriberId,
            referral_code=payload.referralCode,
            email=payload.email,
            amount=payload.amount,
        )
        return res
    except Exception as e:
        print(f"VIP upgrade error: {e}")
        return JSONResponse(status_code=500, content={"error": "Failed to process VIP upgrade."})
