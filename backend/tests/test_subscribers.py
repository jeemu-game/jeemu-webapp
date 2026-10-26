"""Subscribers endpoint and lifecycle tests."""

import uuid


def test_invalid_email_rejection(client):
    payloads = [
        {"email": "", "name": "Tester"},
        {"email": "invalid-no-at", "name": "Tester"},
        {"email": "missing@domain", "name": "Tester"},
    ]
    for p in payloads:
        res = client.post("/api/subscribers", json=p)
        assert res.status_code == 400
        assert "error" in res.json()


def test_honeypot_bot_defense(client):
    payload = {
        "email": "bot@automated-spam.com",
        "name": "Bot Spammer",
        "hp_jeemu_check": "I am a hidden bot input",
    }
    res = client.post("/api/subscribers", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["isNew"] is False
    assert data["subscriber"]["id"] == "bot_trapped"


def test_subscriber_insert_and_deduplication(client):
    unique = uuid.uuid4().hex[:8]
    test_email = f"backer_{unique}@testjeemu.com"
    test_name = f"Backer {unique}"

    # 1. New subscriber creation
    res1 = client.post("/api/subscribers", json={"email": test_email, "name": test_name})
    assert res1.status_code == 201
    data1 = res1.json()
    assert data1["success"] is True
    assert data1["isNew"] is True
    sub1 = data1["subscriber"]
    assert sub1["email"] == test_email.lower()
    ref_code = sub1["referralCode"]
    assert ref_code.startswith("JEEMU-")

    # 2. Duplicate subscriber creation (same email)
    res2 = client.post("/api/subscribers", json={"email": test_email, "name": "Duplicate Backer"})
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["success"] is True
    assert data2["isNew"] is False
    sub2 = data2["subscriber"]
    assert sub2["referralCode"] == ref_code
    assert "Welcome back" in data2["message"]


def test_friend_signup_with_referral_code(client):
    unique = uuid.uuid4().hex[:8]
    inviter_email = f"inviter_{unique}@testjeemu.com"
    res1 = client.post("/api/subscribers", json={"email": inviter_email, "name": "Inviter"})
    assert res1.status_code == 201
    inviter_ref = res1.json()["subscriber"]["referralCode"]

    friend_email = f"friend_{unique}@testjeemu.com"
    res2 = client.post(
        "/api/subscribers",
        json={"email": friend_email, "name": "Friend", "ref": inviter_ref},
    )
    assert res2.status_code == 201
    friend_sub = res2.json()["subscriber"]
    assert friend_sub["referredBy"] == inviter_ref


def test_list_subscribers(client):
    # Without token -> 401 Unauthorized
    unauth_res = client.get("/api/subscribers")
    assert unauth_res.status_code == 401

    # With valid Supabase OAuth token -> 200 OK
    auth_res = client.get(
        "/api/subscribers",
        headers={"Authorization": "Bearer test-supabase-admin-token"},
    )
    assert auth_res.status_code == 200
    data = auth_res.json()
    assert data["success"] is True
    assert isinstance(data["subscribers"], list)
    assert data["count"] == len(data["subscribers"])


def test_patch_referral_returns_forbidden(client):
    res = client.patch("/api/subscribers/JEEMU-TEST/refer")
    assert res.status_code == 403
    assert "error" in res.json()
