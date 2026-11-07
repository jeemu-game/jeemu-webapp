"""Regression tests for the production hardening pass.

Each test pins a problem that was found on the live site: whitespace in env vars, guessable default
secrets, open admin logins, wildcard lookups, unauthenticated resubscribe, unbounded analytics, bare
text 500s and an email provider that refuses to send.
"""

import httpx
import pytest
from fastapi.testclient import TestClient

import app.auth as auth_module
from app.adapters.resend_email import ResendEmailAdapter
from app.adapters.smtp_email import SmtpEmailAdapter, generate_unsubscribe_token
from app.adapters.supabase_rest import SupabaseRestAdapter
from app.config import Settings, _default_env, settings
from app.main import app
from app.modules import backer_intake

# ---------------------------------------------------------------- config


def test_env_values_are_trimmed_and_unquoted(monkeypatch):
    monkeypatch.setenv("SUPABASE_SECRET_KEY", "sb_secret_abc \n")
    monkeypatch.setenv("SUPABASE_URL", '"https://x.supabase.co" ')
    monkeypatch.setenv("ADMIN_PASSWORD", "  hunter2\n")
    monkeypatch.setenv("DEPOSIT_ENABLED", "true ")
    cfg = Settings(_env_file=None)
    assert cfg.SUPABASE_SECRET_KEY == "sb_secret_abc"
    assert cfg.SUPABASE_URL == "https://x.supabase.co"
    assert cfg.ADMIN_PASSWORD == "hunter2"
    assert cfg.DEPOSIT_ENABLED is True


def test_no_guessable_defaults(monkeypatch):
    for name in ("SUPABASE_URL", "ADMIN_PASSWORD", "UNSUBSCRIBE_SECRET", "ADMIN_EMAILS"):
        monkeypatch.delenv(name, raising=False)
    cfg = Settings(_env_file=None)
    assert cfg.SUPABASE_URL is None
    assert cfg.ADMIN_PASSWORD is None
    assert cfg.UNSUBSCRIBE_SECRET is None
    assert cfg.allowed_admin_emails == []


def test_vercel_deployments_default_to_production(monkeypatch):
    monkeypatch.delenv("VERCEL", raising=False)
    assert _default_env() == "development"
    monkeypatch.setenv("VERCEL", "1")
    assert _default_env() == "production"


# ---------------------------------------------------------------- admin auth


def test_admin_password_works_only_when_configured(client, monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_PASSWORD", None)
    # The old public default must never open the admin routes.
    res = client.get("/api/subscribers", headers={"X-Admin-Key": "jeemu2026"})
    assert res.status_code == 401

    monkeypatch.setattr(settings, "ADMIN_PASSWORD", "a-long-random-secret")
    assert client.get("/api/subscribers", headers={"X-Admin-Key": "wrong"}).status_code == 401
    ok = client.get("/api/subscribers", headers={"X-Admin-Key": "a-long-random-secret"})
    assert ok.status_code == 200


def test_non_ascii_admin_key_is_rejected_not_a_server_error(client, monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_PASSWORD", "a-long-random-secret")
    res = client.get("/api/subscribers", headers={"X-Admin-Key": b"caf\xe9"})
    assert res.status_code == 401


class _FakeSupabaseAuth:
    """Stands in for Supabase's /auth/v1/user: every token belongs to the same logged-in user."""

    def __init__(self, email):
        self.email = email

    def __call__(self, *args, **kwargs):
        return self

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def get(self, url, headers=None):
        class Resp:
            status_code = 200

            def json(_self):
                return {"id": "u1", "email": self.email}

        return Resp()


@pytest.mark.parametrize(
    ("admin_emails", "expected"),
    [
        (None, 403),  # no allowlist configured: nobody gets in through a Supabase login
        ("someone.else@jeemu.fun", 403),
        ("info@jeemu.fun", 200),
        (" INFO@jeemu.fun , other@jeemu.fun ", 200),
    ],
)
def test_supabase_login_requires_admin_allowlist(client, monkeypatch, admin_emails, expected):
    monkeypatch.setattr(settings, "ENV", "production")
    monkeypatch.setattr(settings, "SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setattr(settings, "ADMIN_PASSWORD", None)
    monkeypatch.setattr(settings, "ADMIN_EMAILS", admin_emails)
    monkeypatch.setattr(auth_module, "_verified_cache", {})
    monkeypatch.setattr(auth_module.httpx, "AsyncClient", _FakeSupabaseAuth("info@jeemu.fun"))
    res = client.get("/api/subscribers", headers={"Authorization": "Bearer any-valid-user-token"})
    assert res.status_code == expected


def test_unexpected_auth_provider_reply_is_a_clean_401(client, monkeypatch):
    monkeypatch.setattr(settings, "ENV", "production")
    monkeypatch.setattr(settings, "SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setattr(settings, "ADMIN_PASSWORD", None)
    monkeypatch.setattr(auth_module, "_verified_cache", {})

    class WeirdReply(_FakeSupabaseAuth):
        async def get(self, url, headers=None):
            class Resp:
                status_code = 200

                def json(_self):
                    return []

            return Resp()

    monkeypatch.setattr(auth_module.httpx, "AsyncClient", WeirdReply(None))
    res = client.get("/api/subscribers", headers={"Authorization": "Bearer whatever"})
    assert res.status_code == 401


# ---------------------------------------------------------------- Supabase adapter queries


def _recording_adapter(monkeypatch, rows):
    adapter = SupabaseRestAdapter(supabase_url="https://x.supabase.co", supabase_key="k")
    seen = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(200, json=rows)

    monkeypatch.setattr(
        adapter,
        "_client",
        lambda: httpx.AsyncClient(transport=httpx.MockTransport(handler), headers=adapter.headers),
    )
    return adapter, seen


async def test_email_lookup_is_exact_not_a_wildcard(monkeypatch):
    adapter, seen = _recording_adapter(monkeypatch, [])
    # '%' and '_' are wildcards under ilike: this address used to match other subscribers.
    assert await adapter.find_by_email("%@gmail.com") is None
    params = seen[0].url.params
    assert params["email"] == "eq.%@gmail.com"
    assert "ilike" not in str(seen[0].url)


async def test_referral_lookup_is_exact_not_a_wildcard(monkeypatch):
    adapter, seen = _recording_adapter(monkeypatch, [])
    await adapter.find_by_referral_code("JEEMU-%")
    assert seen[0].url.params["referral_code"] == "EQ.JEEMU-%".replace("EQ.", "eq.")
    assert "ilike" not in str(seen[0].url)


async def test_post_id_cannot_inject_extra_filters(monkeypatch):
    post = {"id": "p1", "category": "feed", "likes": 1}
    adapter, seen = _recording_adapter(monkeypatch, [post])
    await adapter.react_to_post("feed", "p1&id=neq.zzz", "rip")
    for request in seen:
        assert request.url.params.get_list("id") == ["eq.p1&id=neq.zzz"]


# ---------------------------------------------------------------- signup


def test_percent_sign_emails_are_rejected(client):
    res = client.post("/api/subscribers", json={"email": "%@gmail.com"})
    assert res.status_code == 400


def test_new_signup_response_hides_internal_fields(client):
    res = client.post("/api/subscribers", json={"email": "newperson@testjeemu.com", "name": "N"})
    assert res.status_code == 201
    sub = res.json()["subscriber"]
    assert sub["referralCode"].startswith("JEEMU-")
    for hidden in ("stripeChargeId", "stripeSessionId", "isVip", "depositAmount", "unsubscribed"):
        assert hidden not in sub


def test_duplicate_signup_email_is_throttled(client, monkeypatch):
    backer_intake._last_resend.clear()
    sent = []

    async def fake_send(self, subscriber):
        sent.append(subscriber["email"])
        return {"success": True}

    monkeypatch.setattr(SmtpEmailAdapter, "send_signup_confirmation_email", fake_send)
    body = {"email": "twice@testjeemu.com", "name": "Twice"}
    assert client.post("/api/subscribers", json=body).status_code == 201  # welcome email
    assert client.post("/api/subscribers", json=body).status_code == 200  # first resend allowed
    assert client.post("/api/subscribers", json=body).status_code == 200  # throttled
    assert client.post("/api/subscribers", json=body).status_code == 200  # throttled
    assert sent == ["twice@testjeemu.com", "twice@testjeemu.com"]
    backer_intake._last_resend.clear()


# ---------------------------------------------------------------- unsubscribe / resubscribe


def test_unsubscribe_requires_valid_token_in_every_environment(client, monkeypatch):
    client.post("/api/subscribers", json={"email": "tokenless@testjeemu.com"})
    for env in ("test", "development", "production"):
        monkeypatch.setattr(settings, "ENV", env)
        res = client.get("/api/unsubscribe", params={"email": "tokenless@testjeemu.com"})
        assert res.status_code == 403, env
        bad = client.get(
            "/api/unsubscribe", params={"email": "tokenless@testjeemu.com", "token": "x" * 32}
        )
        assert bad.status_code == 403, env


def test_unsubscribe_links_are_disabled_when_no_secret_in_production(client, monkeypatch):
    monkeypatch.setattr(settings, "ENV", "production")
    monkeypatch.setattr(settings, "UNSUBSCRIBE_SECRET", None)
    monkeypatch.setattr(settings, "ADMIN_PASSWORD", None)
    res = client.get("/api/unsubscribe", params={"email": "a@b.co", "token": "x" * 32})
    assert res.status_code == 403  # a clean refusal, not a crash


def test_resubscribe_needs_the_signed_token(client):
    email = "resub@testjeemu.com"
    client.post("/api/subscribers", json={"email": email})
    token = generate_unsubscribe_token(email)
    assert (
        client.get("/api/unsubscribe", params={"email": email, "token": token}).status_code == 200
    )

    def unsubscribed() -> bool:
        listing = client.get(
            "/api/subscribers", headers={"Authorization": "Bearer test-supabase-admin-token"}
        )
        return next(s for s in listing.json()["subscribers"] if s["email"] == email)["unsubscribed"]

    assert unsubscribed() is True
    for data in ({"email": email}, {"email": email, "token": "x" * 32}):
        res = client.post("/api/resubscribe", data=data, follow_redirects=False)
        assert res.status_code == 303
        assert "resubscribed=0" in res.headers["location"]
        assert unsubscribed() is True  # untouched

    ok = client.post(
        "/api/resubscribe", data={"email": email, "token": token}, follow_redirects=False
    )
    assert "resubscribed=1" in ok.headers["location"]
    assert unsubscribed() is False


def test_unsubscribe_page_carries_token_for_resubscribe(client):
    email = "page@testjeemu.com"
    client.post("/api/subscribers", json={"email": email})
    token = generate_unsubscribe_token(email)
    page = client.get("/api/unsubscribe", params={"email": email, "token": token})
    assert f'name="token" value="{token}"' in page.text


# ---------------------------------------------------------------- telemetry


def test_telemetry_accepts_what_the_site_sends(client):
    event = {
        "type": "story_stage",
        "visitorId": "v_" + "a" * 36,
        "sessionId": "s_" + "b" * 36,
        "url": "/",
        "utm": {"utm_source": "tiktok", "ref": "JEEMU-ABCD1234"},
        "data": {"stage": "tower"},
        "dwellSeconds": 12,
    }
    assert client.post("/api/v1/telemetry/event", json=event).status_code == 200


@pytest.mark.parametrize(
    "bad",
    [
        {"type": "x" * 100},
        {"type": "has spaces and <script>"},
        {"type": "ok", "data": {"blob": "z" * 5000}},
        {"type": "ok", "visitorId": "v" * 500},
        {"type": "ok", "dwellSeconds": -5},
    ],
)
def test_telemetry_rejects_oversized_or_malformed_events(client, bad):
    assert client.post("/api/v1/telemetry/event", json=bad).status_code == 422


def test_telemetry_trims_utm_and_url(client):
    event = {
        "type": "page_view",
        "url": "/" + "p" * 1000,
        "utm": {f"k{i}": "v" * 999 for i in range(60)},
    }
    res = client.post("/api/v1/telemetry/event", json=event)
    assert res.status_code == 200
    stored = res.json()["event"]
    assert len(stored["url"]) <= 300
    assert len(stored["utm"]) <= 20
    assert all(len(v) <= 200 for v in stored["utm"].values())


def test_reaction_types_are_whitelisted(client):
    res = client.post("/api/posts/chaos/anything/react", json={"reactionType": "x" * 50})
    assert res.status_code == 422


# ---------------------------------------------------------------- errors


def test_crashes_become_json_without_leaking_details(isolated_adapter, monkeypatch):
    def boom():
        raise RuntimeError("secret internal detail https://db.internal/key")

    monkeypatch.setattr("app.routers.telemetry.get_adapter", boom)
    with TestClient(app, raise_server_exceptions=False) as crash_client:
        res = crash_client.get("/api/posts")
    assert res.status_code == 500
    assert res.headers["content-type"].startswith("application/json")
    body = res.json()
    assert body["error"]
    assert len(body["requestId"]) == 12
    assert "secret internal detail" not in res.text


def test_waitlist_count_failure_does_not_leak_error_text(client, monkeypatch, isolated_adapter):
    async def broken():
        raise RuntimeError("401 for url https://db.internal/rest/v1/subscribers")

    monkeypatch.setattr(isolated_adapter, "get_subscriber_count", broken)
    body = client.get("/api/waitlist/count").json()
    assert body["count"] == 0
    assert "detail" not in body
    assert "db.internal" not in str(body)


def test_oversized_request_bodies_are_refused(client):
    res = client.post(
        "/api/subscribers",
        content=b"x" * (300 * 1024),
        headers={"Content-Type": "application/json"},
    )
    assert res.status_code == 413


# ---------------------------------------------------------------- email delivery


async def test_email_falls_back_to_resend_when_smtp_refuses(monkeypatch):
    calls = []

    def smtp_refuses(self, **mail):
        calls.append("smtp")
        return {
            "success": False,
            "error": "554 5.7.1 Outbound sending is disabled for this account",
        }

    async def resend_sends(self, **mail):
        calls.append("resend")
        return {"success": True, "provider": "resend"}

    monkeypatch.setattr(SmtpEmailAdapter, "dispatch_mail", smtp_refuses)
    monkeypatch.setattr(ResendEmailAdapter, "is_configured", lambda self: True)
    monkeypatch.setattr(ResendEmailAdapter, "send_mail", resend_sends)
    result = await SmtpEmailAdapter().send_signup_confirmation_email(
        {"email": "a@testjeemu.com", "name": "A", "referralCode": "JEEMU-1"}
    )
    assert result == {"success": True, "provider": "resend"}
    assert calls == ["smtp", "resend"]


async def test_resend_is_not_used_when_smtp_works(monkeypatch):
    async def resend_sends(self, **mail):
        raise AssertionError("Resend must not be called when SMTP succeeded")

    monkeypatch.setattr(ResendEmailAdapter, "is_configured", lambda self: True)
    monkeypatch.setattr(ResendEmailAdapter, "send_mail", resend_sends)
    monkeypatch.setattr(SmtpEmailAdapter, "dispatch_mail", lambda self, **mail: {"success": True})
    result = await SmtpEmailAdapter().send_signup_confirmation_email(
        {"email": "a@testjeemu.com", "name": "A", "referralCode": "JEEMU-1"}
    )
    assert result == {"success": True}


async def test_resend_is_used_directly_when_smtp_is_not_configured(monkeypatch):
    sent = []

    async def resend_sends(self, **mail):
        sent.append(mail["to"])
        return {"success": True, "provider": "resend"}

    monkeypatch.setattr(settings, "ENV", "production")
    monkeypatch.setattr(settings, "UNSUBSCRIBE_SECRET", "s3cret")
    monkeypatch.setattr(settings, "SMTP_PASS", None)
    monkeypatch.setattr(settings, "HOSTINGER_EMAIL_PASS", None)
    monkeypatch.setattr(ResendEmailAdapter, "is_configured", lambda self: True)
    monkeypatch.setattr(ResendEmailAdapter, "send_mail", resend_sends)
    result = await SmtpEmailAdapter().send_signup_confirmation_email(
        {"email": "a@testjeemu.com", "name": "A", "referralCode": "JEEMU-1"}
    )
    assert result["provider"] == "resend"
    assert sent == ["a@testjeemu.com"]


async def test_failure_everywhere_returns_the_smtp_error_not_a_crash(monkeypatch):
    monkeypatch.setattr(
        SmtpEmailAdapter, "dispatch_mail", lambda self, **mail: {"success": False, "error": "nope"}
    )
    monkeypatch.setattr(ResendEmailAdapter, "is_configured", lambda self: False)
    result = await SmtpEmailAdapter().send_signup_confirmation_email(
        {"email": "a@testjeemu.com", "name": "A", "referralCode": "JEEMU-1"}
    )
    assert result == {"success": False, "error": "nope"}
