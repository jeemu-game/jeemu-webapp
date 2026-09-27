import uuid
import pytest
import requests

BASE_URL = "http://localhost:3000"


def test_api_health():
    """Verify /api/health endpoint returns 200 and healthy status."""
    res = requests.get(f"{BASE_URL}/api/health", timeout=5)
    assert res.status_code == 200
    data = res.json()
    assert data.get("status") == "ok"
    assert data.get("service") == "jeemu-api"


def test_waitlist_count():
    """Verify /api/waitlist/count returns real-time count from Supabase."""
    res = requests.get(f"{BASE_URL}/api/waitlist/count", timeout=5)
    assert res.status_code == 200
    data = res.json()
    assert "count" in data
    assert isinstance(data["count"], int)
    assert data["count"] >= 1848
    assert "rawCount" in data


def test_subscribers_invalid_email():
    """Verify /api/subscribers rejects invalid email formats with 400."""
    payloads = [
        {"email": "", "name": "Tester"},
        {"email": "invalid-email-no-at", "name": "Tester"},
        {"email": "missing@domain", "name": "Tester"},
    ]
    for p in payloads:
        res = requests.post(f"{BASE_URL}/api/subscribers", json=p, timeout=5)
        assert res.status_code == 400
        data = res.json()
        assert "error" in data


def test_bot_honeypot_defense():
    """Verify honeypot field drops bot submissions silently without error."""
    payload = {
        "email": "bot@automated-spam.com",
        "name": "Bot Spammer",
        "hp_jeemu_check": "I am a hidden bot input"
    }
    res = requests.post(f"{BASE_URL}/api/subscribers", json=payload, timeout=5)
    assert res.status_code == 200
    data = res.json()
    assert data.get("success") is True
    assert data.get("isNew") is False
    assert data.get("subscriber", {}).get("id") == "bot_trapped"


def test_subscribers_insert_and_deduplication():
    """Verify valid email insertion into Supabase and graceful deduplication."""
    unique_id = uuid.uuid4().hex[:8]
    test_email = f"backer_{unique_id}@testjeemu.com"
    test_name = f"Backer {unique_id}"

    # 1. First insert (new backer)
    res1 = requests.post(
        f"{BASE_URL}/api/subscribers",
        json={"email": test_email, "name": test_name},
        timeout=8
    )
    assert res1.status_code == 201
    data1 = res1.json()
    assert data1.get("success") is True
    assert data1.get("isNew") is True
    sub1 = data1.get("subscriber")
    assert sub1 is not None
    assert sub1.get("email") == test_email.lower()
    ref_code = sub1.get("referralCode")
    assert ref_code and ref_code.startswith("JEEMU-")

    # 2. Duplicate insert (same backer)
    res2 = requests.post(
        f"{BASE_URL}/api/subscribers",
        json={"email": test_email, "name": "Duplicate Backer"},
        timeout=8
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2.get("success") is True
    assert data2.get("isNew") is False
    sub2 = data2.get("subscriber")
    assert sub2.get("referralCode") == ref_code


def test_stripe_session_creation():
    """Verify /api/stripe/create-session returns valid payment redirect."""
    payload = {
        "subscriberId": "sub_test_123",
        "referralCode": "JEEMU-TEST",
        "email": "earlybird@jeemu.test"
    }
    res = requests.post(f"{BASE_URL}/api/stripe/create-session", json=payload, timeout=5)
    assert res.status_code == 200
    data = res.json()
    assert "url" in data
    assert data["url"].startswith("http")


def test_rate_limiting_protection():
    """Verify rate-limiting headers and protective threshold are enforced."""
    res = requests.get(f"{BASE_URL}/api/waitlist/count", timeout=5)
    assert res.status_code == 200
    # Standard rate-limiting headers must be present
    assert "RateLimit-Limit" in res.headers
    assert "RateLimit-Remaining" in res.headers
    assert int(res.headers["RateLimit-Remaining"]) >= 0
