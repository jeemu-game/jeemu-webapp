"""Stripe checkout session and webhook tests."""

def test_stripe_session_creation(client):
    payload = {
        "subscriberId": "sub_test_123",
        "referralCode": "JEEMU-TEST",
        "email": "earlybird@jeemu.test",
    }
    res = client.post("/api/stripe/create-session", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "url" in data
    assert data["url"].startswith("http")


def test_stripe_webhook_checkout_completed(client):
    # First create a subscriber
    res_sub = client.post("/api/subscribers", json={"email": "stripe_backer@jeemu.test", "name": "Stripe Tester"})
    assert res_sub.status_code == 201
    sub = res_sub.json()["subscriber"]

    webhook_payload = {
        "id": "evt_test_123",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_session_abc",
                "customer_email": "stripe_backer@jeemu.test",
                "payment_intent": "pi_test_charge_xyz",
                "metadata": {
                    "subscriber_id": sub["id"],
                    "referral_code": sub["referralCode"],
                },
            }
        },
    }
    res = client.post("/api/stripe/webhook", json=webhook_payload)
    assert res.status_code == 200
    assert res.json()["received"] is True

    # Verify subscriber is now marked VIP
    res_check = client.get("/api/subscribers")
    updated = next((s for s in res_check.json()["subscribers"] if s["email"] == "stripe_backer@jeemu.test"), None)
    assert updated is not None
    assert updated["isVip"] is True
    assert updated["depositAmount"] == 1.0
