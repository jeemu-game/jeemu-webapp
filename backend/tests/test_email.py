"""Email service, templates, and Google Sheets tests."""

import pytest
from app.adapters.google_sheets import GoogleSheetsAdapter, format_subscriber_for_sheet
from app.adapters.smtp_email import (
    SmtpEmailAdapter,
    generate_unsubscribe_token,
    get_unsubscribe_url,
    verify_unsubscribe_token,
)


def test_unsubscribe_hmac_security():
    test_email = "alex.founder@jeemu.test"
    token = generate_unsubscribe_token(test_email)
    assert len(token) == 32

    assert verify_unsubscribe_token(test_email, token) is True
    assert verify_unsubscribe_token(test_email, "invalid_token_123456789012345678") is False
    assert verify_unsubscribe_token("other@jeemu.test", token) is False

    unsub_url = get_unsubscribe_url(test_email, "https://jeemu.fun")
    assert "/api/unsubscribe" in unsub_url
    assert f"token={token}" in unsub_url


@pytest.mark.asyncio
async def test_email_simulation_dispatch():
    adapter = SmtpEmailAdapter()
    sub = {
        "name": "Sarah Connor",
        "email": "sarah@skynet-defense.com",
        "referralCode": "JEEMU-SARAH1",
        "unsubscribed": False,
    }

    # Signup confirmation
    res1 = await adapter.send_signup_confirmation_email(sub)
    assert res1["success"] is True

    # Milestone update
    res2 = await adapter.send_referral_milestone_email(referrer=sub, new_backer_name="John Connor", new_count=1)
    assert res2["success"] is True

    # VIP deposit receipt
    res3 = await adapter.send_vip_deposit_receipt_email(sub, amount=1.0, charge_id="ch_test_123")
    assert res3["success"] is True

    # Unsubscribed guard: must be skipped!
    unsub_sub = {**sub, "unsubscribed": True}
    res_skipped = await adapter.send_signup_confirmation_email(unsub_sub)
    assert res_skipped["skipped"] is True
    assert res_skipped["reason"] == "unsubscribed"


def test_google_sheets_payload_and_csv():
    sub = {
        "id": "sub_test_99",
        "name": "Marcus Wright",
        "email": "marcus@resistance.org",
        "referralCode": "JEEMU-M99",
        "referredBy": "JEEMU-SARAH1",
        "friendsReferred": 4,
        "isVip": True,
        "depositAmount": 1.0,
        "stripeChargeId": "ch_marcus99",
        "unsubscribed": False,
        "timestamp": 1727500000000,
    }
    sheet_payload = format_subscriber_for_sheet(sub, "vip")
    assert sheet_payload["email"] == "marcus@resistance.org"
    assert sheet_payload["isVip"] == "YES ($1.00)"
    assert sheet_payload["friendsReferred"] == 4
    assert sheet_payload["unsubscribed"] == "NO"

    csv_data = GoogleSheetsAdapter.generate_subscribers_csv([sub])
    assert csv_data.startswith("\uFEFF")
    assert '"Marcus Wright"' in csv_data
    assert '"marcus@resistance.org"' in csv_data
    assert '"YES"' in csv_data
