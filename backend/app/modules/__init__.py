"""Modules package exports."""

from app.modules.backer_intake import BackerIntakeService
from app.modules.referral_security import (
    canonicalize_email,
    is_self_referral,
    process_vip_referral_credit,
    sanitize_referral_on_signup,
)
from app.modules.telemetry import TelemetryService, broadcaster
from app.modules.vip_deposit import VipDepositService

__all__ = [
    "BackerIntakeService",
    "VipDepositService",
    "canonicalize_email",
    "is_self_referral",
    "sanitize_referral_on_signup",
    "process_vip_referral_credit",
    "TelemetryService",
    "broadcaster",
]
