"""VIP deposit registration and upgrade tests."""

def test_vip_deposit_upgrade(client):
    # 1. Create referrer
    res_ref = client.post("/api/subscribers", json={"email": "vip_referrer@jeemu.test", "name": "Referrer"})
    assert res_ref.status_code == 201
    ref_code = res_ref.json()["subscriber"]["referralCode"]

    # 2. Create friend using referral code
    res_friend = client.post(
        "/api/subscribers",
        json={"email": "vip_friend@jeemu.test", "name": "Friend", "ref": ref_code},
    )
    assert res_friend.status_code == 201
    friend_id = res_friend.json()["subscriber"]["id"]

    # 3. Friend completes $1 VIP deposit
    res_vip = client.post(
        "/api/subscribers/vip",
        json={"subscriberId": friend_id, "amount": 1.0},
    )
    assert res_vip.status_code == 200
    data = res_vip.json()
    assert data["success"] is True
    assert data["subscriber"]["isVip"] is True
    assert data["subscriber"]["depositAmount"] == 1.0
    assert data["stripeChargeId"] is not None

    # 4. Verify referrer's friendsReferred count is now incremented to 1
    res_list = client.get("/api/subscribers")
    referrer = next((s for s in res_list.json()["subscribers"] if s["email"] == "vip_referrer@jeemu.test"), None)
    assert referrer is not None
    assert referrer["friendsReferred"] == 1
