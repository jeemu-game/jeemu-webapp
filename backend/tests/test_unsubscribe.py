"""Unsubscribe and Resubscribe endpoint tests."""

from urllib.parse import quote

from app.adapters.smtp_email import generate_unsubscribe_token


def test_unsubscribe_endpoint_missing_email(client):
    res = client.get("/api/unsubscribe")
    assert res.status_code == 400
    assert "Invalid unsubscribe link" in res.text


def test_unsubscribe_and_resubscribe_flow(client):
    test_email = "alex_unsub@jeemu.test"
    # Create subscriber
    res_sub = client.post("/api/subscribers", json={"email": test_email, "name": "Alex"})
    assert res_sub.status_code == 201

    token = generate_unsubscribe_token(test_email)
    res_unsub = client.get(f"/api/unsubscribe?email={quote(test_email)}&token={token}")
    assert res_unsub.status_code == 200
    assert "You Have Been Unsubscribed" in res_unsub.text

    # Verify subscriber is now marked unsubscribed
    auth_header = {"Authorization": "Bearer test-supabase-admin-token"}
    res_list = client.get("/api/subscribers", headers=auth_header)
    assert res_list.status_code == 200
    sub = next((s for s in res_list.json()["subscribers"] if s["email"] == test_email), None)
    assert sub is not None
    assert sub["unsubscribed"] is True

    # Now resubscribe (requires the same signed token)
    res_resub = client.post(
        "/api/resubscribe", data={"email": test_email, "token": token}, follow_redirects=False
    )
    assert res_resub.status_code == 303
    assert "resubscribed=1" in res_resub.headers["location"]

    # Verify subscriber is now resubscribed
    res_list2 = client.get("/api/subscribers", headers=auth_header)
    assert res_list2.status_code == 200
    sub2 = next((s for s in res_list2.json()["subscribers"] if s["email"] == test_email), None)
    assert sub2 is not None
    assert sub2["unsubscribed"] is False
