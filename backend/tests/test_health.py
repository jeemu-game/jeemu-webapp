"""Health and waitlist count endpoint tests."""


def test_health_check(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["service"] == "jeemu-api"
    assert data["platform"] == "fastapi-python"
    assert "timestamp" in data

    # Also root prefix
    res2 = client.get("/health")
    assert res2.status_code == 200


def test_waitlist_count(client):
    res = client.get("/api/waitlist/count")
    assert res.status_code == 200
    data = res.json()
    assert "count" in data
    assert isinstance(data["count"], int)
    assert "rawCount" in data
    assert "RateLimit-Limit" in res.headers
    assert "RateLimit-Remaining" in res.headers
