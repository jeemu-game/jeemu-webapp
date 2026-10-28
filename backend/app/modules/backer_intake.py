"""Backer Intake & Signup Orchestrator."""

import asyncio
import re
import time
from typing import Any

from app.adapters import get_adapter
from app.adapters.google_sheets import GoogleSheetsAdapter
from app.adapters.smtp_email import SmtpEmailAdapter
from app.modules.referral_security import sanitize_referral_on_signup

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")


# Fields a visitor is allowed to see about their own new signup. Never Stripe IDs or internal flags.
PUBLIC_SUBSCRIBER_FIELDS = ("id", "email", "name", "referralCode", "referredBy", "timestamp")

# An address that is already on the list gets its welcome email re-sent at most this often, so the
# signup form cannot be used to flood someone else's inbox.
RESEND_COOLDOWN_SECONDS = 15 * 60
_last_resend: dict[str, float] = {}


def _public_subscriber(subscriber: dict[str, Any]) -> dict[str, Any]:
    return {k: subscriber[k] for k in PUBLIC_SUBSCRIBER_FIELDS if k in subscriber}


def _resend_allowed(email: str, now: float | None = None) -> bool:
    """True (and records the attempt) when this email may be re-sent a confirmation now."""
    now = time.monotonic() if now is None else now
    for key in [k for k, t in _last_resend.items() if now - t > RESEND_COOLDOWN_SECONDS]:
        del _last_resend[key]
    if email in _last_resend:
        return False
    _last_resend[email] = now
    return True


def sanitize_string(val: str | None, max_len: int = 100) -> str:
    if not val or not isinstance(val, str):
        return ""
    # Strip HTML tags
    cleaned = re.sub(r"<[^>]*>", "", val).strip()
    return cleaned[:max_len]


class BackerIntakeService:
    def __init__(
        self,
        repository=None,
        email_adapter: SmtpEmailAdapter | None = None,
        sheets_adapter: GoogleSheetsAdapter | None = None,
    ):
        self.repo = repository or get_adapter()
        self.email = email_adapter or SmtpEmailAdapter()
        self.sheets = sheets_adapter or GoogleSheetsAdapter()

    async def intake_backer(
        self,
        email: str,
        name: str | None = "Backer",
        ref: str | None = None,
        hp_jeemu_check: str | None = None,
    ) -> tuple[int, dict[str, Any]]:
        """Handles backer waitlist registration with bot defense, dedup, and async email/sheet sync.
        Returns (status_code, response_dict).
        """
        # 1. Honeypot check
        if hp_jeemu_check:
            print("🤖 Bot trapped by honeypot field, silently dropping.")
            return 200, {
                "success": True,
                "subscriber": {
                    "id": "bot_trapped",
                    "email": "filtered@jeemu.test",
                    "name": "Friend",
                    "referralCode": "JEEMU-BOT0",
                },
                "isNew": False,
            }

        # 2. Email format validation
        clean_email = sanitize_string(email, 120).lower()
        if not clean_email or not EMAIL_REGEX.match(clean_email):
            return 400, {"error": "Please provide a valid email address."}

        clean_name = sanitize_string(name, 60) or "Backer"
        raw_ref = sanitize_string(ref, 20)

        # 3. Anti-Self-Referral & code validation
        valid_referrer = await sanitize_referral_on_signup(
            ref_code=raw_ref,
            candidate_email=clean_email,
            find_by_referral_code_fn=self.repo.find_by_referral_code,
        )
        clean_ref = valid_referrer.get("referralCode") if valid_referrer else None

        # 4. Deduplication. The response never reveals anything about an existing subscriber (not their
        #    referral code, not their Stripe data): whoever typed the address may not be its owner.
        existing = await self.repo.find_by_email(clean_email)
        if existing:
            if _resend_allowed(clean_email):
                try:
                    await self.email.send_signup_confirmation_email(existing)
                except Exception as e:
                    print(f"Error resending confirmation to existing backer: {e}")

                try:
                    await self.sheets.sync_subscriber(existing, "resend")
                except Exception as e:
                    print(f"Error syncing resend to sheets: {e}")

            return 200, {
                "success": True,
                "subscriber": {"email": clean_email},
                "isNew": False,
                "message": "You are already on the list. If you need your referral link, check your email.",
            }

        # 5. Create new subscriber
        new_sub = await self.repo.create_subscriber(
            email=clean_email,
            name=clean_name,
            ref=clean_ref,
        )

        # 6. Welcome email and Sheets sync run side by side so signup is not slowed by either.
        async def send_welcome() -> None:
            try:
                await self.email.send_signup_confirmation_email(new_sub)
            except Exception as e:
                print(f"Error sending welcome email: {e}")

        async def sync_sheet() -> None:
            try:
                await self.sheets.sync_subscriber(new_sub, "signup")
            except Exception as e:
                print(f"Error syncing new subscriber to sheets: {e}")

        await asyncio.gather(send_welcome(), sync_sheet())

        return 201, {
            "success": True,
            "subscriber": _public_subscriber(new_sub),
            "isNew": True,
        }
