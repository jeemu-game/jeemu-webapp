"""Supabase REST API Adapter (PostgREST) for Serverless and Production.

Directly communicates with Supabase PostgreSQL via HTTPS REST API using the
server-side SUPABASE_SECRET_KEY. Ensures zero local-file fallbacks on Vercel
and serverless environments.
"""

import random
import string
import string as py_string
import time
from typing import Any

import httpx

from app.config import settings


def _generate_referral_code() -> str:
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"JEEMU-{suffix}"


def _sub_row_to_dict(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row.get("id"),
        "email": row.get("email"),
        "name": row.get("name") or "Backer",
        "referralCode": row.get("referral_code"),
        "referredBy": row.get("referred_by"),
        "timestamp": int(row.get("timestamp") or 0),
        "isVip": bool(row.get("is_vip")),
        "depositAmount": float(row.get("deposit_amount") or 0.0),
        "friendsReferred": int(row.get("friends_referred") or 0),
        "stripeChargeId": row.get("stripe_charge_id"),
        "stripeSessionId": row.get("stripe_session_id"),
        "vipTimestamp": int(row["vip_timestamp"]) if row.get("vip_timestamp") else None,
        "unsubscribed": bool(row.get("unsubscribed", False)),
        "unsubscribedAt": int(row["unsubscribed_at"]) if row.get("unsubscribed_at") else None,
    }


def _event_row_to_dict(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row.get("id"),
        "type": row.get("type"),
        "timestamp": int(row.get("timestamp") or 0),
        "isoTime": row.get("iso_time"),
        "visitorId": row.get("visitor_id"),
        "sessionId": row.get("session_id"),
        "url": row.get("url"),
        "utm": row.get("utm") or {},
        "dwellSeconds": int(row.get("dwell_seconds") or 0),
        "data": row.get("data") or {},
    }


def _post_row_to_dict(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row.get("id"),
        "category": row.get("category"),
        "author": row.get("author"),
        "role": row.get("role"),
        "authorInitials": row.get("author_initials"),
        "date": row.get("date"),
        "title": row.get("title"),
        "content": row.get("content"),
        "image": row.get("image"),
        "likes": int(row.get("likes") or 0),
        "comments": int(row.get("comments") or 0),
        "tag": row.get("tag"),
        "reactions": row.get("reactions") or {"rip": 0, "chaos": 0, "sip": 0},
        "milestone": row.get("milestone"),
        "description": row.get("description"),
        "badge": row.get("badge"),
        "timestamp": int(row["timestamp"]) if row.get("timestamp") else None,
    }


class SupabaseRestAdapter:
    def __init__(
        self,
        supabase_url: str | None = None,
        supabase_key: str | None = None,
    ):
        raw_url = supabase_url or settings.SUPABASE_URL
        raw_key = (
            supabase_key
            or settings.SUPABASE_SECRET_KEY
            or settings.SUPABASE_SERVICE_ROLE_KEY
            or settings.SUPABASE_PUBLISHABLE_KEY
        )

        if not raw_url or not raw_key:
            raise ValueError(
                "SupabaseRestAdapter requires SUPABASE_URL and SUPABASE_SECRET_KEY to be set in environment variables."
            )

        self.base_url = raw_url.rstrip("/")
        self.rest_url = f"{self.base_url}/rest/v1"
        self.key = raw_key
        self.headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
        }

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(timeout=10.0, headers=self.headers)

    # ==================== SUBSCRIBERS ====================

    async def get_subscriber_count(self) -> int:
        url = f"{self.rest_url}/subscribers?select=id"
        headers = {**self.headers, "Prefer": "count=exact", "Range": "0-0"}
        async with self._client() as client:
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
            cr = resp.headers.get("content-range", "")
            if "/" in cr:
                total_part = cr.split("/")[-1].strip()
                if total_part.isdigit():
                    return int(total_part)
            return len(resp.json())

    async def get_subscribers(self) -> list[dict[str, Any]]:
        url = f"{self.rest_url}/subscribers?select=*&order=timestamp.desc"
        async with self._client() as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return [_sub_row_to_dict(r) for r in resp.json()]

    async def find_by_email(self, email: str) -> dict[str, Any] | None:
        if not email:
            return None
        clean_email = email.lower().strip()
        url = f"{self.rest_url}/subscribers?email=ilike.{clean_email}&select=*"
        async with self._client() as client:
            resp = await client.get(url)
            resp.raise_for_status()
            rows = resp.json()
            return _sub_row_to_dict(rows[0]) if rows else None

    async def find_by_referral_code(self, code: str) -> dict[str, Any] | None:
        if not code:
            return None
        clean_code = code.upper().strip()
        url = f"{self.rest_url}/subscribers?referral_code=ilike.{clean_code}&select=*"
        async with self._client() as client:
            resp = await client.get(url)
            resp.raise_for_status()
            rows = resp.json()
            return _sub_row_to_dict(rows[0]) if rows else None

    async def create_subscriber(
        self, email: str, name: str = "Backer", ref: str | None = None
    ) -> dict[str, Any]:
        referral_code = _generate_referral_code()
        now = int(time.time() * 1000)

        # Ensure referral code uniqueness
        existing_ref = await self.find_by_referral_code(referral_code)
        while existing_ref:
            referral_code = _generate_referral_code()
            existing_ref = await self.find_by_referral_code(referral_code)

        payload = {
            "id": f"sub_{now}",
            "email": email.lower().strip(),
            "name": name or "Backer",
            "referral_code": referral_code,
            "referred_by": ref if ref else None,
            "timestamp": now,
            "is_vip": False,
            "deposit_amount": 0.0,
            "friends_referred": 0,
        }

        url = f"{self.rest_url}/subscribers"
        headers = {**self.headers, "Prefer": "return=representation"}
        async with self._client() as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            rows = resp.json()
            return _sub_row_to_dict(rows[0])

    async def mark_subscriber_vip(
        self,
        subscriber_id: str | None = None,
        referral_code: str | None = None,
        email: str | None = None,
        amount: float = 1.0,
        stripe_session_id: str | None = None,
        stripe_payment_intent: str | None = None,
    ) -> dict[str, Any]:
        charge_id = stripe_payment_intent or (
            "ch_3M"
            + "".join(random.choices(py_string.ascii_letters + py_string.digits, k=9))
            + "StripeJeemu"
        )
        now = int(time.time() * 1000)

        # Lookup target
        target = None
        if email:
            target = await self.find_by_email(email)
        elif subscriber_id:
            url = f"{self.rest_url}/subscribers?id=eq.{subscriber_id}&select=*"
            async with self._client() as client:
                r = await client.get(url)
                rows = r.json() if r.status_code == 200 else []
                if rows:
                    target = _sub_row_to_dict(rows[0])
        elif referral_code:
            target = await self.find_by_referral_code(referral_code)

        if not target:
            return {
                "subscriber": None,
                "stripeChargeId": charge_id,
                "wasAlreadyVip": False,
            }

        was_already_vip = bool(target.get("isVip"))
        patch_payload: dict[str, Any] = {
            "is_vip": True,
            "deposit_amount": float(amount),
            "vip_timestamp": now,
            "stripe_charge_id": charge_id,
        }

        url = f"{self.rest_url}/subscribers?id=eq.{target['id']}"
        headers = {**self.headers, "Prefer": "return=representation"}
        async with self._client() as client:
            resp = await client.patch(url, headers=headers, json=patch_payload)
            resp.raise_for_status()
            rows = resp.json()
            updated_sub = _sub_row_to_dict(rows[0]) if rows else target
            return {
                "subscriber": updated_sub,
                "stripeChargeId": charge_id,
                "wasAlreadyVip": was_already_vip,
            }

    async def increment_referral_count(self, referral_code: str) -> dict[str, Any] | None:
        target = await self.find_by_referral_code(referral_code)
        if not target:
            return None

        new_count = int(target.get("friendsReferred") or 0) + 1
        url = f"{self.rest_url}/subscribers?id=eq.{target['id']}"
        headers = {**self.headers, "Prefer": "return=representation"}
        async with self._client() as client:
            resp = await client.patch(url, headers=headers, json={"friends_referred": new_count})
            resp.raise_for_status()
            rows = resp.json()
            return _sub_row_to_dict(rows[0]) if rows else None

    async def unsubscribe_user(self, email: str) -> dict[str, Any] | None:
        if not email:
            return None
        clean_email = email.lower().strip()
        target = await self.find_by_email(clean_email)
        now = int(time.time() * 1000)

        if target:
            # Try to patch unsubscribed column if schema allows
            url = f"{self.rest_url}/subscribers?id=eq.{target['id']}"
            headers = {**self.headers, "Prefer": "return=representation"}
            try:
                async with self._client() as client:
                    await client.patch(
                        url, headers=headers, json={"unsubscribed": True, "unsubscribed_at": now}
                    )
            except Exception:
                pass
            target["unsubscribed"] = True
            target["unsubscribedAt"] = now
            return target

        return {"email": clean_email, "unsubscribed": True, "unsubscribedAt": now}

    async def resubscribe_user(self, email: str) -> dict[str, Any] | None:
        if not email:
            return None
        clean_email = email.lower().strip()
        target = await self.find_by_email(clean_email)
        if target:
            url = f"{self.rest_url}/subscribers?id=eq.{target['id']}"
            headers = {**self.headers, "Prefer": "return=representation"}
            try:
                async with self._client() as client:
                    await client.patch(
                        url, headers=headers, json={"unsubscribed": False, "unsubscribed_at": None}
                    )
            except Exception:
                pass
            target["unsubscribed"] = False
            target["unsubscribedAt"] = None
            return target

        return {"email": clean_email, "unsubscribed": False}

    # ==================== TELEMETRY ====================

    async def log_event(self, event_data: dict[str, Any]) -> dict[str, Any]:
        now = int(time.time() * 1000)
        event_id = f"ev_{now}_" + "".join(
            random.choices(py_string.ascii_lowercase + py_string.digits, k=6)
        )

        payload = {
            "id": event_id,
            "type": event_data.get("type", "unknown"),
            "timestamp": now,
            "iso_time": time.strftime("%H:%M:%S", time.localtime()),
            "visitor_id": event_data.get("visitorId"),
            "session_id": event_data.get("sessionId"),
            "url": event_data.get("url"),
            "utm": event_data.get("utm") or {},
            "dwell_seconds": int(event_data.get("dwellSeconds", 0) or 0),
            "data": event_data.get("data") or {},
        }

        url = f"{self.rest_url}/telemetry_events"
        headers = {**self.headers, "Prefer": "return=representation"}
        async with self._client() as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            rows = resp.json()
            return _event_row_to_dict(rows[0]) if rows else payload

    async def get_metrics(self) -> dict[str, Any]:
        async with self._client() as client:
            # Fetch events limit 500
            ev_resp = await client.get(
                f"{self.rest_url}/telemetry_events?select=*&order=timestamp.desc&limit=500"
            )
            events = (
                [_event_row_to_dict(e) for e in ev_resp.json()]
                if ev_resp.status_code == 200
                else []
            )

            # Fetch subscribers
            sub_resp = await client.get(f"{self.rest_url}/subscribers?select=*")
            subscribers = (
                [_sub_row_to_dict(s) for s in sub_resp.json()]
                if sub_resp.status_code == 200
                else []
            )

        unique_visitors = len({e.get("visitorId") for e in events if e.get("visitorId")}) or 1
        unique_sessions = len({e.get("sessionId") for e in events if e.get("sessionId")}) or 1
        clicks = [e for e in events if e.get("type") == "click"]
        email_signups = len(subscribers)
        vip_deposits = len([s for s in subscribers if s.get("isVip")])

        conv_rate = round((email_signups / unique_visitors) * 100, 1) if unique_visitors > 0 else 0
        vip_rate = round((vip_deposits / email_signups) * 100, 1) if email_signups > 0 else 0

        funnel = {
            "landed": unique_visitors,
            "simulator": len([e for e in events if e.get("type") == "simulator_block_tap"]),
            "email": email_signups,
            "vipViewed": len(
                [
                    e
                    for e in events
                    if e.get("type") == "view_vip_modal"
                    or (e.get("data") and e.get("data", {}).get("id") == "btn-open-vip-nav")
                ]
            )
            + (1 if vip_deposits > 0 else 0),
            "vipReserved": vip_deposits,
            "shared": len(
                [e for e in events if e.get("type") in ("referral_link_copied", "share_click")]
            ),
        }

        click_counts: dict[str, int] = {}
        for c in clicks:
            c_data = c.get("data") or {}
            key = (c_data.get("label") or c_data.get("id") or c_data.get("tag") or "element")[:32]
            click_counts[key] = click_counts.get(key, 0) + 1
        top_clicks = sorted(click_counts.items(), key=lambda x: x[1], reverse=True)[:6]

        heatmap_points = [
            {
                "x": c.get("data", {}).get("x"),
                "y": c.get("data", {}).get("y"),
                "xPercent": c.get("data", {}).get("xPercent"),
                "yPercent": c.get("data", {}).get("yPercent"),
            }
            for c in clicks
            if c.get("data") and c.get("data", {}).get("x") is not None
        ]

        return {
            "uniqueVisitors": unique_visitors,
            "uniqueSessions": unique_sessions,
            "totalClicks": len(clicks),
            "emailSignups": email_signups,
            "vipDeposits": vip_deposits,
            "vipRevenue": f"{vip_deposits * 1.0:.2f}",
            "convRate": conv_rate,
            "vipRate": vip_rate,
            "topClicks": top_clicks,
            "funnel": funnel,
            "heatmapPoints": heatmap_points,
            "recentEvents": events[:30],
        }

    async def get_recent_events(self, limit: int = 50) -> list[dict[str, Any]]:
        url = f"{self.rest_url}/telemetry_events?select=*&order=timestamp.desc&limit={limit}"
        async with self._client() as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return [_event_row_to_dict(e) for e in resp.json()]

    # ==================== POSTS ====================

    async def get_posts(self) -> dict[str, list[dict[str, Any]]]:
        url = f"{self.rest_url}/posts?select=*&order=created_at.desc"
        async with self._client() as client:
            resp = await client.get(url)
            resp.raise_for_status()
            rows = resp.json()

        posts: dict[str, list[dict[str, Any]]] = {"feed": [], "chaos": [], "journey": []}
        for p in rows:
            p_dict = _post_row_to_dict(p)
            cat = p.get("category")
            if cat in posts:
                posts[cat].append(p_dict)
        posts["journey"].sort(key=lambda x: x.get("timestamp") or 0)
        return posts

    async def create_post(self, category: str, post_data: dict[str, Any]) -> dict[str, Any]:
        now = int(time.time() * 1000)
        payload = {
            "id": f"{category}_{now}",
            "category": category,
            "author": post_data.get("author", "Anonymous"),
            "role": post_data.get("role"),
            "author_initials": post_data.get("authorInitials"),
            "date": post_data.get("date", "Today"),
            "title": post_data.get("title"),
            "content": post_data.get("content"),
            "image": post_data.get("image"),
            "likes": int(post_data.get("likes", 0) or 0),
            "comments": int(post_data.get("comments", 0) or 0),
            "tag": post_data.get("tag"),
            "reactions": post_data.get("reactions") or {"rip": 0, "chaos": 0, "sip": 0},
            "milestone": post_data.get("milestone"),
            "description": post_data.get("description"),
            "badge": post_data.get("badge"),
            "timestamp": now,
        }

        url = f"{self.rest_url}/posts"
        headers = {**self.headers, "Prefer": "return=representation"}
        async with self._client() as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            rows = resp.json()
            return _post_row_to_dict(rows[0])

    async def react_to_post(
        self, category: str, post_id: str, reaction_type: str
    ) -> dict[str, Any] | None:
        # Fetch current post
        url = f"{self.rest_url}/posts?id=eq.{post_id}&select=*"
        async with self._client() as client:
            r = await client.get(url)
            rows = r.json() if r.status_code == 200 else []
            if not rows:
                return None
            target = rows[0]

            patch_data: dict[str, Any] = {}
            if category == "feed":
                patch_data["likes"] = int(target.get("likes", 0) or 0) + 1
            elif category == "chaos":
                reactions = dict(target.get("reactions") or {"rip": 0, "chaos": 0, "sip": 0})
                reactions[reaction_type] = int(reactions.get(reaction_type, 0)) + 1
                patch_data["reactions"] = reactions

            headers = {**self.headers, "Prefer": "return=representation"}
            patch_resp = await client.patch(url, headers=headers, json=patch_data)
            patch_resp.raise_for_status()
            updated_rows = patch_resp.json()
            return _post_row_to_dict(updated_rows[0]) if updated_rows else None
