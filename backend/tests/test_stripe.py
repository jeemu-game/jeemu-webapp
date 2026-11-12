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
    res_sub = client.post(
        "/api/subscribers", json={"email": "stripe_backer@jeemu.test", "name": "Stripe Tester"}
    )
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
    auth_header = {"Authorization": "Bearer test-supabase-admin-token"}
    res_check = client.get("/api/subscribers", headers=auth_header)
    assert res_check.status_code == 200
    updated = next(
        (s for s in res_check.json()["subscribers"] if s["email"] == "stripe_backer@jeemu.test"),
        None,
    )
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
    res = client.post(
        "/api/stripe/webhook", json={"type": "checkout.session.completed", "data": {"object": {}}}
    )
    assert res.status_code == 503


def test_webhook_requires_signature_when_secret_set(client, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "sk_test_x")
    monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_x")
    res = client.post(
        "/api/stripe/webhook", json={"type": "checkout.session.completed", "data": {"object": {}}}
    )
    assert res.status_code == 400


def test_payment_link_webhook_matches_by_client_reference_id(client):
    """The $1 VIP Payment Link: the buyer may pay with a different email, so match on client_reference_id."""
    a = client.post("/api/subscribers", json={"email": "vip_a@jeemu.test", "name": "A"}).json()[
        "subscriber"
    ]
    b = client.post("/api/subscribers", json={"email": "vip_b@jeemu.test", "name": "B"}).json()[
        "subscriber"
    ]
    payload = {
        "id": "evt_link_1",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_live_link_1",
                "client_reference_id": a["referralCode"],
                "customer_details": {"email": "someone.else@jeemu.test"},
                "payment_intent": "pi_link_1",
                "amount_total": 100,
                "metadata": {},
            }
        },
    }
    assert client.post("/api/stripe/webhook", json=payload).status_code == 200
    rows = client.get(
        "/api/subscribers", headers={"Authorization": "Bearer test-supabase-admin-token"}
    ).json()["subscribers"]
    by_email = {s["email"]: s for s in rows}
    assert by_email["vip_a@jeemu.test"]["isVip"] is True
    assert by_email["vip_a@jeemu.test"]["depositAmount"] == 1.0
    assert not by_email["vip_b@jeemu.test"].get("isVip")
    assert b["email"] == "vip_b@jeemu.test"


def test_webhook_verifies_signature_with_only_the_webhook_secret(client, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", None)
    monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_x")
    res = client.post(
        "/api/stripe/webhook", json={"type": "checkout.session.completed", "data": {"object": {}}}
    )
    assert res.status_code == 400


def test_webhook_ignores_unpaid_session(client):
    sub = client.post("/api/subscribers", json={"email": "unpaid@jeemu.test", "name": "U"}).json()[
        "subscriber"
    ]
    payload = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_unpaid1234",
                "payment_status": "unpaid",
                "customer_email": "unpaid@jeemu.test",
                "metadata": {},
            }
        },
    }
    assert client.post("/api/stripe/webhook", json=payload).status_code == 200
    rows = client.get(
        "/api/subscribers", headers={"Authorization": "Bearer test-supabase-admin-token"}
    ).json()["subscribers"]
    me = next(s for s in rows if s["email"] == "unpaid@jeemu.test")
    assert not me.get("isVip")
    assert sub["email"] == "unpaid@jeemu.test"


def _fake_stripe(monkeypatch, session):
    from app.adapters.stripe_adapter import StripeAdapter

    async def fake_retrieve(self, session_id):
        return session

    monkeypatch.setattr(StripeAdapter, "is_configured", lambda self: True)
    monkeypatch.setattr(StripeAdapter, "retrieve_session", fake_retrieve)


def test_checkout_status_rejects_malformed_ids(client):
    assert (
        client.get("/api/stripe/checkout-status", params={"session_id": "nope"}).status_code == 400
    )
    assert client.get(
        "/api/stripe/checkout-status", params={"session_id": "cs_test_" + "x" * 300}
    ).status_code in (400, 422)


def test_checkout_status_needs_stripe_key(client, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", None)
    res = client.get("/api/stripe/checkout-status", params={"session_id": "cs_test_abcdefgh1234"})
    assert res.status_code == 503 and res.json()["paid"] is False


def test_checkout_status_paid_vip_returns_only_the_referral_code(client, monkeypatch):
    sub = client.post("/api/subscribers", json={"email": "payer@jeemu.test", "name": "P"}).json()[
        "subscriber"
    ]
    session = {
        "payment_status": "paid",
        "customer_details": {"email": "payer@jeemu.test"},
        "client_reference_id": sub["referralCode"],
        "id": "cs_test_abcdefgh1234",
        "payment_intent": "pi_1",
    }
    _fake_stripe(monkeypatch, session)
    # before the webhook has run: paid, not yet VIP, no code is revealed
    early = client.get(
        "/api/stripe/checkout-status", params={"session_id": "cs_test_abcdefgh1234"}
    ).json()
    assert early == {"paid": True, "vip": False, "referralCode": None}
    client.post(
        "/api/stripe/webhook",
        json={"type": "checkout.session.completed", "data": {"object": session}},
    )
    res = client.get(
        "/api/stripe/checkout-status", params={"session_id": "cs_test_abcdefgh1234"}
    ).json()
    assert res == {"paid": True, "vip": True, "referralCode": sub["referralCode"]}


def test_checkout_status_unpaid_or_unknown_reveals_nothing(client, monkeypatch):
    _fake_stripe(
        monkeypatch, {"payment_status": "unpaid", "customer_details": {"email": "x@jeemu.test"}}
    )
    assert client.get(
        "/api/stripe/checkout-status", params={"session_id": "cs_test_abcdefgh1234"}
    ).json() == {"paid": False}
    _fake_stripe(
        monkeypatch,
        {"payment_status": "paid", "customer_details": {"email": "stranger@jeemu.test"}},
    )
    assert client.get(
        "/api/stripe/checkout-status", params={"session_id": "cs_test_abcdefgh1234"}
    ).json() == {"paid": True, "vip": False}


def _signed(payload: dict, secret: str):
    """Exactly how Stripe signs a webhook: HMAC-SHA256 over '<timestamp>.<body>' with the signing secret."""
    import hashlib
    import hmac
    import json
    import time

    body = json.dumps(payload)
    ts = int(time.time())
    sig = hmac.new(secret.encode(), f"{ts}.{body}".encode(), hashlib.sha256).hexdigest()
    return body, {"Stripe-Signature": f"t={ts},v1={sig}", "Content-Type": "application/json"}


def test_real_signed_webhook_marks_vip_with_the_real_stripe_library(client, monkeypatch):
    """Regression: stripe-python 16 returns objects that are not dicts; the handler used to crash on every real event."""
    from app.config import settings

    monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_unit_test")
    sub = client.post("/api/subscribers", json={"email": "real@jeemu.test", "name": "R"}).json()[
        "subscriber"
    ]
    event = {
        "id": "evt_real_1",
        "object": "event",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_live_realpath1234",
                "object": "checkout.session",
                "payment_status": "paid",
                "amount_total": 100,
                "customer_email": None,
                "customer_details": {"email": "REAL@jeemu.test"},
                "client_reference_id": sub["referralCode"],
                "metadata": {},
                "payment_intent": "pi_real",
            }
        },
    }
    body, headers = _signed(event, "whsec_unit_test")
    assert client.post("/api/stripe/webhook", content=body, headers=headers).status_code == 200
    rows = client.get(
        "/api/subscribers", headers={"Authorization": "Bearer test-supabase-admin-token"}
    ).json()["subscribers"]
    me = next(s for s in rows if s["email"] == "real@jeemu.test")
    assert me["isVip"] is True and me["depositAmount"] == 1.0


def test_webhook_rejects_a_forged_signature(client, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "whsec_unit_test")
    body, headers = _signed(
        {"type": "checkout.session.completed", "data": {"object": {"payment_status": "paid"}}},
        "whsec_wrong",
    )
    assert client.post("/api/stripe/webhook", content=body, headers=headers).status_code == 400


def test_webhook_returns_500_when_recording_fails_so_stripe_retries(client, monkeypatch):
    from app.modules.vip_deposit import VipDepositService

    async def boom(self, **kw):
        raise RuntimeError("database down")

    monkeypatch.setattr(VipDepositService, "handle_vip_deposit", boom)
    payload = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_x1234567",
                "payment_status": "paid",
                "customer_email": "a@jeemu.test",
            }
        },
    }
    assert client.post("/api/stripe/webhook", json=payload).status_code == 500
