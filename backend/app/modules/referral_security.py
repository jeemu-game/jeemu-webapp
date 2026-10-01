"""Jeemu Anti-Cheat & VIP Referral Security Service."""

import re
from typing import Any, Callable, Dict, Optional


def canonicalize_email(email: str) -> str:
    """Normalizes an email address for anti-abuse and self-referral checking.
    Strips plus addressing (+tag) and dots for Gmail/Google Workspace domains.
    """
    if not email or not isinstance(email, str):
        return ""
    clean = email.lower().strip()
    if "@" not in clean:
        return clean

    local, domain = clean.split("@", 1)
    if domain in ("gmail.com", "googlemail.com"):
        local = local.split("+")[0].replace(".", "")
        domain = "gmail.com"
    else:
        local = local.split("+")[0]

    return f"{local}@{domain}"


def is_self_referral(
    referrer_email: Optional[str] = None,
    referrer_ref_code: Optional[str] = None,
    referee_email: Optional[str] = None,
    referee_ref_code: Optional[str] = None,
) -> bool:
    """Determines whether a referral relationship is a self-referral attempt."""
    # 1. Matching referral codes
    if referrer_ref_code and referee_ref_code:
        if referrer_ref_code.upper().strip() == referee_ref_code.upper().strip():
            return True

    # 2. Direct or canonical email match
    if referrer_email and referee_email:
        ref_clean = referrer_email.lower().strip()
        sub_clean = referee_email.lower().strip()
        if ref_clean == sub_clean:
            return True
        if canonicalize_email(ref_clean) == canonicalize_email(sub_clean):
            return True

    return False


async def sanitize_referral_on_signup(
    ref_code: Optional[str],
    candidate_email: str,
    find_by_referral_code_fn: Callable,
) -> Optional[Dict[str, Any]]:
    """Validates a referral code during signup.
    Returns the valid referrer dict if legitimate, or None if invalid or self-referral.
    """
    if not ref_code:
        return None
    clean_ref = ref_code.upper().strip()

    try:
        referrer = await find_by_referral_code_fn(clean_ref)
        if not referrer:
            print(f"ℹ️ [Referral Signup] Referral code {clean_ref} not found in database.")
            return None

        # Check self-referral
        if is_self_referral(
            referrer_email=referrer.get("email"),
            referrer_ref_code=referrer.get("referralCode"),
            referee_email=candidate_email,
            referee_ref_code=None,
        ):
            print(f"🛡️ [Self-Referral Blocked on Signup] {candidate_email} attempted to use own referral code {clean_ref}.")
            return None

        return referrer
    except Exception as e:
        print(f"⚠️ [Referral Validation Error] {e}")
        return None


async def process_vip_referral_credit(
    paying_subscriber: Dict[str, Any],
    was_already_vip: bool = False,
    find_by_referral_code_fn: Optional[Callable] = None,
    increment_referral_count_fn: Optional[Callable] = None,
    send_milestone_email_fn: Optional[Callable] = None,
    sync_sheet_fn: Optional[Callable] = None,
) -> Optional[Dict[str, Any]]:
    """Credits a referral ONLY after a $1 VIP deposit is verified."""
    if not paying_subscriber:
        return None

    # 1. Guard: If they were already VIP, do not re-credit
    if was_already_vip:
        print(f"ℹ️ [VIP Referral Skipped] {paying_subscriber.get('email')} was already VIP.")
        return None

    # 2. Guard: Must have an active referral code
    ref_code = paying_subscriber.get("referredBy")
    if not ref_code:
        return None

    # 3. Guard: Deposit amount must be at least $1.00
    amount = float(paying_subscriber.get("depositAmount") or 0.0)
    if amount < 1.0:
        print(f"⚠️ [VIP Referral Skipped] Deposit amount for {paying_subscriber.get('email')} is ${amount:.2f} (< $1.00).")
        return None

    if not find_by_referral_code_fn or not increment_referral_count_fn:
        return None

    try:
        referrer = await find_by_referral_code_fn(ref_code)
        if not referrer:
            print(f"⚠️ [VIP Referral Error] Referrer code {ref_code} not found.")
            return None

        # 4. Anti-Self-Referral Guard
        if is_self_referral(
            referrer_email=referrer.get("email"),
            referrer_ref_code=referrer.get("referralCode"),
            referee_email=paying_subscriber.get("email"),
            referee_ref_code=paying_subscriber.get("referralCode"),
        ):
            print(f"🛡️ [Self-Referral Blocked at Payment] {paying_subscriber.get('email')} attempted to credit own code.")
            return None

        # 5. Verified Paid VIP Referral: Increment count
        updated_referrer = await increment_referral_count_fn(referrer.get("referralCode"))
        new_count = (
            updated_referrer.get("friendsReferred")
            if updated_referrer
            else int(referrer.get("friendsReferred") or 0) + 1
        )

        print(f"🎉 [VIP Referral Credited!] {paying_subscriber.get('email')} paid ${amount:.2f} deposit!")
        print(f"   👉 Referrer {referrer.get('email')} unlocked Milestone progress: {new_count} paid friend(s).")

        # 6. Dispatch Milestone Update Email
        if send_milestone_email_fn:
            try:
                await send_milestone_email_fn(
                    referrer=updated_referrer or referrer,
                    new_backer_name=paying_subscriber.get("name") or "A friend",
                    new_count=new_count,
                )
            except Exception as mail_err:
                print(f"❌ [Milestone Email Error] Failed to send milestone alert: {mail_err}")

        # 7. Sync updated referrer count to Google Sheet
        if sync_sheet_fn:
            try:
                await sync_sheet_fn(updated_referrer or referrer, "milestone")
            except Exception as sheet_err:
                print(f"⚠️ [Sheet Sync Error] Failed to sync updated referrer milestone: {sheet_err}")

        return {
            "credited": True,
            "referrerEmail": referrer.get("email"),
            "referralCode": referrer.get("referralCode"),
            "newCount": new_count,
        }
    except Exception as e:
        print(f"❌ [VIP Referral Credit Exception] {e}")
        return None
