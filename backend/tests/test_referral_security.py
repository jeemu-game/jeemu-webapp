"""Referral security and anti-cheat unit tests."""

import pytest

from app.modules.referral_security import (
    canonicalize_email,
    is_self_referral,
    process_vip_referral_credit,
    sanitize_referral_on_signup,
)


def test_email_canonicalization():
    assert canonicalize_email("Shiva.Manickam@gmail.com") == "shivamanickam@gmail.com"
    assert canonicalize_email("shiva+test1@gmail.com") == "shiva@gmail.com"
    assert canonicalize_email("s.h.i.v.a+alias99@googlemail.com") == "shiva@gmail.com"
    assert canonicalize_email("alex+vip@jeemu.fun") == "alex@jeemu.fun"
    assert canonicalize_email("founder@tetr.com") == "founder@tetr.com"


def test_anti_self_referral_detection():
    # Same code
    assert (
        is_self_referral(
            referrer_email="shiva@gmail.com",
            referrer_ref_code="JEEMU-SHIV",
            referee_email="other@gmail.com",
            referee_ref_code="JEEMU-SHIV",
        )
        is True
    )

    # Exact email match
    assert (
        is_self_referral(
            referrer_email="shiva@gmail.com",
            referrer_ref_code="JEEMU-SHIV",
            referee_email="shiva@gmail.com",
            referee_ref_code=None,
        )
        is True
    )

    # Gmail alias match
    assert (
        is_self_referral(
            referrer_email="shiva@gmail.com",
            referrer_ref_code="JEEMU-SHIV",
            referee_email="s.h.i.v.a+backer2@gmail.com",
            referee_ref_code=None,
        )
        is True
    )

    # Legitimate different user
    assert (
        is_self_referral(
            referrer_email="shiva@gmail.com",
            referrer_ref_code="JEEMU-SHIV",
            referee_email="alex.friend@gmail.com",
            referee_ref_code="JEEMU-ALEX",
        )
        is False
    )


@pytest.mark.asyncio
async def test_signup_referral_sanitization():
    mock_db = [{"email": "shiva@gmail.com", "referralCode": "JEEMU-SHIV", "friendsReferred": 0}]

    async def mock_find(code):
        return next((s for s in mock_db if s["referralCode"] == code), None)

    # Self referral on signup
    sanitized_self = await sanitize_referral_on_signup(
        ref_code="JEEMU-SHIV",
        candidate_email="shiva+alias@gmail.com",
        find_by_referral_code_fn=mock_find,
    )
    assert sanitized_self is None

    # Legitimate referral on signup
    sanitized_legit = await sanitize_referral_on_signup(
        ref_code="JEEMU-SHIV",
        candidate_email="sarah.connor@resistance.net",
        find_by_referral_code_fn=mock_find,
    )
    assert sanitized_legit is not None
    assert sanitized_legit["referralCode"] == "JEEMU-SHIV"


@pytest.mark.asyncio
async def test_vip_referral_credit_and_guards():
    mock_referrer = {
        "email": "marcus@resistance.org",
        "referralCode": "JEEMU-MARC",
        "friendsReferred": 0,
    }
    paying_friend = {
        "id": "sub_paid_001",
        "name": "Kyle Reese",
        "email": "kyle@resistance.org",
        "referralCode": "JEEMU-KYLE",
        "referredBy": "JEEMU-MARC",
        "depositAmount": 1.0,
        "isVip": True,
    }

    referrer_count = 0
    milestone_dispatched = False
    sheet_synced = False

    async def mock_find(code):
        return mock_referrer if code == "JEEMU-MARC" else None

    async def mock_increment(code):
        nonlocal referrer_count
        referrer_count += 1
        return {**mock_referrer, "friendsReferred": referrer_count}

    async def mock_email(**kwargs):
        nonlocal milestone_dispatched
        milestone_dispatched = True

    async def mock_sheet(sub, event):
        nonlocal sheet_synced
        sheet_synced = True

    # 1. Legitimate credit
    res = await process_vip_referral_credit(
        paying_subscriber=paying_friend,
        was_already_vip=False,
        find_by_referral_code_fn=mock_find,
        increment_referral_count_fn=mock_increment,
        send_milestone_email_fn=mock_email,
        sync_sheet_fn=mock_sheet,
    )
    assert res is not None
    assert res["credited"] is True
    assert referrer_count == 1
    assert milestone_dispatched is True
    assert sheet_synced is True

    # 2. Duplicate VIP payment guard
    dup_res = await process_vip_referral_credit(
        paying_subscriber=paying_friend,
        was_already_vip=True,
        find_by_referral_code_fn=mock_find,
        increment_referral_count_fn=mock_increment,
    )
    assert dup_res is None

    # 3. Unpaid deposit guard (< 1.0)
    unpaid_friend = {**paying_friend, "depositAmount": 0.0}
    unpaid_res = await process_vip_referral_credit(
        paying_subscriber=unpaid_friend,
        was_already_vip=False,
        find_by_referral_code_fn=mock_find,
        increment_referral_count_fn=mock_increment,
    )
    assert unpaid_res is None

    # 4. Self referral at payment time
    self_paid_friend = {
        **paying_friend,
        "email": "marcus+alt@resistance.org",
        "referredBy": "JEEMU-MARC",
    }
    self_res = await process_vip_referral_credit(
        paying_subscriber=self_paid_friend,
        was_already_vip=False,
        find_by_referral_code_fn=mock_find,
        increment_referral_count_fn=mock_increment,
    )
    assert self_res is None
