"""Security & Supabase OAuth2 Authorization Tests.

Verifies that no private endpoint is accessible without valid Supabase OAuth2 credentials.
"""


def test_endpoints_strictly_require_auth(client):
    protected_endpoints = [
        ("GET", "/api/subscribers"),
        ("POST", "/api/subscribers/vip"),
        ("GET", "/api/admin/subscribers/export"),
        ("GET", "/api/admin/smtp-status"),
        ("POST", "/api/admin/test-email"),
        ("POST", "/api/admin/sync-google-sheet"),
        ("GET", "/api/telemetry/metrics"),
        ("GET", "/api/metrics"),
        ("POST", "/api/posts/feed"),
    ]

    for method, path in protected_endpoints:
        # 1. No Authorization header -> 401
        res_no_auth = client.request(method, path)
        assert res_no_auth.status_code == 401, f"{method} {path} should return 401 without auth"
        assert "detail" in res_no_auth.json()

        # 2. Malformed / Fake token -> 401
        res_bad_auth = client.request(
            method, path, headers={"Authorization": "Bearer bad-token-12345"}
        )
        assert res_bad_auth.status_code == 401, f"{method} {path} should return 401 with bad token"


def test_authenticated_admin_access(client):
    auth_header = {"Authorization": "Bearer test-supabase-admin-token"}

    # Valid token on subscribers
    res_subs = client.get("/api/subscribers", headers=auth_header)
    assert res_subs.status_code == 200

    # Valid token on admin status
    res_status = client.get("/api/admin/smtp-status", headers=auth_header)
    assert res_status.status_code == 200

    # Valid token on metrics
    res_metrics = client.get("/api/telemetry/metrics", headers=auth_header)
    assert res_metrics.status_code == 200


def test_public_endpoints_remain_accessible(client):
    """Public endpoints required for site visitors must remain open."""
    # Health check
    res_health = client.get("/api/health")
    assert res_health.status_code == 200

    # Waitlist count
    res_count = client.get("/api/waitlist/count")
    assert res_count.status_code == 200

    # Community posts feed
    res_posts = client.get("/api/posts")
    assert res_posts.status_code == 200
