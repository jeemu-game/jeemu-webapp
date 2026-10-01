"""Modules package exports."""

from app.modules.backer_intake import BackerIntakeService
from app.modules.vip_deposit import VipDepositService
from app.modules.referral_security import (
    canonicalize_email,
    is_self_referral,
    sanitize_referral_on_signup,
    process_vip_referral_credit,
)
from app.modules.telemetry import TelemetryService, broadcaster

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
