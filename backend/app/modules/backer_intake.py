"""Backer Intake & Signup Orchestrator."""

import re
from typing import Any, Dict, Optional, Tuple
from app.adapters import get_adapter
from app.adapters.google_sheets import GoogleSheetsAdapter
from app.adapters.smtp_email import SmtpEmailAdapter
from app.modules.referral_security import sanitize_referral_on_signup

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")


def sanitize_string(val: Optional[str], max_len: int = 100) -> str:
    if not val or not isinstance(val, str):
        return ""
    # Strip HTML tags
    cleaned = re.sub(r"<[^>]*>", "", val).strip()
    return cleaned[:max_len]


class BackerIntakeService:
    def __init__(
        self,
        repository=None,
        email_adapter: Optional[SmtpEmailAdapter] = None,
        sheets_adapter: Optional[GoogleSheetsAdapter] = None,
    ):
        self.repo = repository or get_adapter()
        self.email = email_adapter or SmtpEmailAdapter()
        self.sheets = sheets_adapter or GoogleSheetsAdapter()

    async def intake_backer(
        self,
        email: str,
        name: Optional[str] = "Backer",
        ref: Optional[str] = None,
        hp_jeemu_check: Optional[str] = None,
    ) -> Tuple[int, Dict[str, Any]]:
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

        # 4. Deduplication
        existing = await self.repo.find_by_email(clean_email)
        if existing:
            try:
                await self.email.send_signup_confirmation_email(existing)
            except Exception as e:
                print(f"Error resending confirmation to existing backer: {e}")

            try:
                await self.sheets.sync_subscriber(existing, "resend")
            except Exception:
                pass

            return 200, {
                "success": True,
                "subscriber": existing,
                "isNew": False,
                "message": "Welcome back! We have sent your Batch 01 reservation details and referral link to your email.",
            }

        # 5. Create new subscriber
        new_sub = await self.repo.create_subscriber(
            email=clean_email,
            name=clean_name,
            ref=clean_ref,
        )

        # 6. Asynchronous Welcome Email & Sheets Sync
        try:
            await self.email.send_signup_confirmation_email(new_sub)
        except Exception as e:
            print(f"Error sending welcome email: {e}")

        try:
            await self.sheets.sync_subscriber(new_sub, "signup")
        except Exception as e:
            print(f"Error syncing new subscriber to sheets: {e}")

        return 201, {
            "success": True,
            "subscriber": new_sub,
            "isNew": True,
        }
