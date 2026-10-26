"""API Versioning & Backward Compatibility Tests."""


def test_api_version_endpoints(client):
    # Test canonical version endpoint
    res1 = client.get("/api/v1/version")
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["apiVersion"] == "v1"
    assert data1["status"] == "stable"
    assert res1.headers.get("X-API-Version") == "v1"

    # Test legacy alias version endpoint
    res2 = client.get("/api/version")
    assert res2.status_code == 200
    assert res2.json()["apiVersion"] == "v1"
    assert res2.headers.get("X-API-Version") == "v1"


def test_versioned_routes_functionality(client):
    # 1. Health check on /api/v1/health
    res_health = client.get("/api/v1/health")
    assert res_health.status_code == 200
    assert res_health.json()["status"] == "ok"
    assert res_health.headers.get("X-API-Version") == "v1"

    # 2. Waitlist count on /api/v1/waitlist/count
    res_count = client.get("/api/v1/waitlist/count")
    assert res_count.status_code == 200
    assert "count" in res_count.json()
    assert res_count.headers.get("X-API-Version") == "v1"

    # 3. Protected subscribers list on /api/v1/subscribers
    # Unauthenticated -> 401
    res_unauth = client.get("/api/v1/subscribers")
    assert res_unauth.status_code == 401
    assert res_unauth.headers.get("X-API-Version") == "v1"

    # Authenticated with Supabase OAuth2 token -> 200
    res_auth = client.get(
        "/api/v1/subscribers",
        headers={"Authorization": "Bearer test-supabase-admin-token"},
    )
    assert res_auth.status_code == 200
    assert "subscribers" in res_auth.json()
    assert res_auth.headers.get("X-API-Version") == "v1"


def test_backward_compatibility_preserved(client):
    # Both /api/health and /health work
    assert client.get("/api/health").status_code == 200
    assert client.get("/health").status_code == 200

    # Both /api/waitlist/count and /api/v1/waitlist/count work
    assert client.get("/api/waitlist/count").status_code == 200
    assert client.get("/api/v1/waitlist/count").status_code == 200
