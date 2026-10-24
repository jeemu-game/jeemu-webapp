"""Stripe checkout session and webhook tests."""

def test_stripe_session_creation(client, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "DEPOSIT_ENABLED", True)
    monkeypatch.setattr(settings, "STRIPE_PAYMENT_LINK", "https://buy.stripe.com/test_link")
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


def test_deposit_disabled_by_default(client):
    res = client.post("/api/stripe/create-session", json={"email": "x@jeemu.test"})
    assert res.status_code == 503
    assert res.json()["mode"] == "disabled"


def test_no_foreign_payment_link_fallback(client, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "DEPOSIT_ENABLED", True)
    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", None)
    monkeypatch.setattr(settings, "STRIPE_PAYMENT_LINK", None)
    res = client.post("/api/stripe/create-session", json={"email": "x@jeemu.test"})
    assert res.status_code == 503
    assert "url" not in res.json()


def test_webhook_unsigned_rejected_in_production(client, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "ENV", "production")
    res = client.post("/api/stripe/webhook", json={"type": "checkout.session.completed", "data": {"object": {}}})
    assert res.status_code == 503


def test_webhook_requires_signature_when_secret_set(client, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "sk_test_x")
    monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_x")
    res = client.post("/api/stripe/webhook", json={"type": "checkout.session.completed", "data": {"object": {}}})
    assert res.status_code == 400
