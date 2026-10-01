"""Subscribers router."""

from typing import Optional
from fastapi import APIRouter, Response, status
from fastapi.responses import JSONResponse
from app.adapters import get_adapter
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
async def list_subscribers():
    adapter = get_adapter()
    try:
        subscribers = await adapter.get_subscribers()
        return {"success": True, "subscribers": subscribers, "count": len(subscribers)}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.patch("/subscribers/{referral_code}/refer")
async def refer_subscriber(referral_code: str):
    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content={
            "error": "Referral milestone credits are strictly awarded upon verified $1 VIP Early Bird deposit payments."
        },
    )


@router.post("/subscribers/vip")
async def upgrade_subscriber_vip(payload: VipUpgradeRequest):
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
        return JSONResponse(status_code=500, content={"error": str(e)})
