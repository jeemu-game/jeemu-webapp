"""Subscriber SQLAlchemy & Pydantic models."""

import time
from datetime import UTC, datetime

from pydantic import BaseModel, ConfigDict, Field
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
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

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
    email: str = Field(..., max_length=120)
    name: str | None = Field("Backer", max_length=100)
    ref: str | None = Field(None, max_length=50)
    hp_jeemu_check: str | None = Field(None, max_length=200)

    model_config = ConfigDict(extra="ignore")


class SubscriberOut(BaseModel):
    id: str
    email: str
    name: str = "Backer"
    referralCode: str = Field(..., serialization_alias="referralCode")
    referredBy: str | None = None
    timestamp: int
    isVip: bool = False
    depositAmount: float = 0.0
    friendsReferred: int = 0
    stripeChargeId: str | None = None
    stripeSessionId: str | None = None
    vipTimestamp: int | None = None
    unsubscribed: bool = False
    unsubscribedAt: int | None = None

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class VipUpgradeRequest(BaseModel):
    subscriberId: str | None = None
    referralCode: str | None = None
    email: str | None = None
    amount: float = 1.0


class VipUpgradeResponse(BaseModel):
    success: bool
    subscriber: SubscriberOut | None = None
    stripeChargeId: str | None = None
