"""VIP Deposit & Upgrade Orchestrator.
Consolidates duplicated logic from VIP registration endpoint & Stripe webhook.
"""

from typing import Any, Dict, Optional
from app.adapters import get_adapter
from app.adapters.google_sheets import GoogleSheetsAdapter
from app.adapters.smtp_email import SmtpEmailAdapter
from app.modules.referral_security import process_vip_referral_credit


class VipDepositService:
    def __init__(
        self,
        repository=None,
        email_adapter: Optional[SmtpEmailAdapter] = None,
        sheets_adapter: Optional[GoogleSheetsAdapter] = None,
    ):
        self.repo = repository or get_adapter()
        self.email = email_adapter or SmtpEmailAdapter()
        self.sheets = sheets_adapter or GoogleSheetsAdapter()

    async def handle_vip_deposit(
        self,
        subscriber_id: Optional[str] = None,
        referral_code: Optional[str] = None,
        email: Optional[str] = None,
        amount: float = 1.0,
        stripe_session_id: Optional[str] = None,
        stripe_payment_intent: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Processes a VIP upgrade, sends receipt, syncs sheet, and credits referrer."""
        result = await self.repo.mark_subscriber_vip(
            subscriber_id=subscriber_id,
            referral_code=referral_code,
            email=email,
            amount=amount,
            stripe_session_id=stripe_session_id,
            stripe_payment_intent=stripe_payment_intent,
        )

        sub = result.get("subscriber")
        charge_id = result.get("stripeChargeId")
        was_already_vip = result.get("wasAlreadyVip", False)

        if sub:
            # 1. Send VIP Founder Deposit Receipt
            try:
                await self.email.send_vip_deposit_receipt_email(
                    subscriber=sub,
                    amount=float(sub.get("depositAmount") or amount),
                    charge_id=charge_id or "",
                )
            except Exception as e:
                print(f"⚠️ Error sending VIP deposit email: {e}")

            # 2. Sync to Google Sheets
            try:
                await self.sheets.sync_subscriber(sub, "vip")
            except Exception as e:
                print(f"⚠️ Error syncing VIP to Google Sheets: {e}")

            # 3. Process referral credit (only if non-duplicate, non-self, and deposit >= 1.0)
            try:
                await process_vip_referral_credit(
                    paying_subscriber=sub,
                    was_already_vip=was_already_vip,
                    find_by_referral_code_fn=self.repo.find_by_referral_code,
                    increment_referral_count_fn=self.repo.increment_referral_count,
                    send_milestone_email_fn=self.email.send_referral_milestone_email,
                    sync_sheet_fn=self.sheets.sync_subscriber,
                )
            except Exception as e:
                print(f"⚠️ Error processing VIP referral credit: {e}")

        return {
            "success": True,
            "subscriber": sub,
            "stripeChargeId": charge_id,
        }
