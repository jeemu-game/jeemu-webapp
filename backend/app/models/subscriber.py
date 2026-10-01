"""Subscriber SQLAlchemy & Pydantic models."""

import time
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import BigInteger, Boolean, Column, DateTime, Numeric, String
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class SubscriberModel(Base):
    __tablename__ = "subscribers"

    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, default="Backer")
    referral_code = Column(String, unique=True, nullable=False, index=True)
    referred_by = Column(String, nullable=True, index=True)
    timestamp = Column(BigInteger, default=lambda: int(time.time() * 1000), nullable=False)
    is_vip = Column(Boolean, default=False)
    deposit_amount = Column(Numeric(10, 2), default=0.00)
    friends_referred = Column(BigInteger, default=0)
    stripe_charge_id = Column(String, nullable=True)
    stripe_session_id = Column(String, nullable=True)
    vip_timestamp = Column(BigInteger, nullable=True)
    unsubscribed = Column(Boolean, default=False)
    unsubscribed_at = Column(BigInteger, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name or "Backer",
            "referralCode": self.referral_code,
            "referredBy": self.referred_by,
            "timestamp": int(self.timestamp) if self.timestamp else int(time.time() * 1000),
            "isVip": bool(self.is_vip),
            "depositAmount": float(self.deposit_amount or 0.0),
            "friendsReferred": int(self.friends_referred or 0),
            "stripeChargeId": self.stripe_charge_id,
            "stripeSessionId": self.stripe_session_id,
            "vipTimestamp": int(self.vip_timestamp) if self.vip_timestamp else None,
            "unsubscribed": bool(self.unsubscribed),
            "unsubscribedAt": int(self.unsubscribed_at) if self.unsubscribed_at else None,
        }


# Pydantic Schemas

class SubscriberCreateRequest(BaseModel):
    email: str
    name: Optional[str] = "Backer"
    ref: Optional[str] = None
    hp_jeemu_check: Optional[str] = None

    model_config = ConfigDict(extra="ignore")


class SubscriberOut(BaseModel):
    id: str
    email: str
    name: str = "Backer"
    referralCode: str = Field(..., serialization_alias="referralCode")
    referredBy: Optional[str] = None
    timestamp: int
    isVip: bool = False
    depositAmount: float = 0.0
    friendsReferred: int = 0
    stripeChargeId: Optional[str] = None
    stripeSessionId: Optional[str] = None
    vipTimestamp: Optional[int] = None
    unsubscribed: bool = False
    unsubscribedAt: Optional[int] = None

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class VipUpgradeRequest(BaseModel):
    subscriberId: Optional[str] = None
    referralCode: Optional[str] = None
    email: Optional[str] = None
    amount: float = 1.0


class VipUpgradeResponse(BaseModel):
    success: bool
    subscriber: Optional[SubscriberOut] = None
    stripeChargeId: Optional[str] = None
