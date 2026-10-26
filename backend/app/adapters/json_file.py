"""Local JSON File Storage Adapter for offline & dev mode."""

import json
import random
import string as py_string
import time
from pathlib import Path
from typing import Any

from app.config import settings
from app.utils.referral import generate_secure_referral_code


class JsonFileAdapter:
    def __init__(self, file_path: Path | None = None):
        self.file_path = file_path or settings.DB_FILE
        self._ensure_loaded()

    def _default_state(self) -> dict[str, Any]:
        return {
            "events": [],
            "subscribers": [
                {
                    "id": "sub_init_1",
                    "email": "alex.tabletop@gmail.com",
                    "name": "Alex Rivera",
                    "referralCode": "JEEMU-VIP982",
                    "referredBy": None,
                    "timestamp": int(time.time() * 1000) - 3600000 * 24,
                    "isVip": True,
                    "depositAmount": 1.0,
                    "friendsReferred": 3,
                    "stripeChargeId": "ch_3M001StripeJeemu",
                    "unsubscribed": False,
                    "unsubscribedAt": None,
                },
                {
                    "id": "sub_init_2",
                    "email": "chloe.boardgames@hey.com",
                    "name": "Chloe Bennett",
                    "referralCode": "JEEMU-B382",
                    "referredBy": "JEEMU-VIP982",
                    "timestamp": int(time.time() * 1000) - 3600000 * 18,
                    "isVip": False,
                    "depositAmount": 0.0,
                    "friendsReferred": 1,
                    "unsubscribed": False,
                    "unsubscribedAt": None,
                },
            ],
            "posts": {
                "feed": [
                    {
                        "id": "feed_1",
                        "author": "Anna Vu",
                        "role": "Hardware & Industrial Design",
                        "authorInitials": "AV",
                        "date": "Sep 18, 2026",
                        "title": "Batch #3 Beechwood Milling: Custom Chamfer & Friction Testing",
                        "category": "Hardware",
                        "content": "We tested 4 different wood finishes this week. Double-sanded beeswax matte polish provides the signature buttery Jenga slide.",
                        "image": "/images/jeemu-hardware.jpg",
                        "likes": 42,
                        "comments": 9,
                        "reactions": {"rip": 0, "chaos": 0, "sip": 0},
                        "timestamp": int(time.time() * 1000) - 86400000 * 3,
                    }
                ],
                "chaos": [
                    {
                        "id": "chaos_1",
                        "author": "Jack",
                        "role": "Game Systems",
                        "authorInitials": "JK",
                        "date": "Yesterday",
                        "tag": "💀 EPIC FAIL",
                        "content": "Playtester Marcus tried to remove Block #45 using his elbows. The entire 32-level tower collapsed into Anna's gin & tonic.",
                        "likes": 0,
                        "comments": 0,
                        "reactions": {"rip": 54, "chaos": 38, "sip": 29},
                        "timestamp": int(time.time() * 1000) - 86400000,
                    }
                ],
                "journey": [
                    {
                        "id": "journey_1",
                        "milestone": "Phase 1: The Frustration",
                        "date": "January 2026",
                        "author": "Shiva & Jack",
                        "title": "Classic Jenga is great for 15 minutes, then gathers dust.",
                        "description": "We taped index cards with handwritten drinking dares to standard blocks.",
                        "badge": "The Spark",
                        "likes": 0,
                        "comments": 0,
                        "reactions": {"rip": 0, "chaos": 0, "sip": 0},
                        "timestamp": int(time.time() * 1000) - 86400000 * 180,
                    }
                ],
            },
            "settings": {
                "stripePaymentLink": settings.STRIPE_PAYMENT_LINK,
                "earlyBirdGoal": 500,
                "launchDate": "2026-10-15T18:00:00Z",
            },
        }

    def _ensure_loaded(self):
        if self.file_path.exists():
            try:
                with open(self.file_path, encoding="utf-8") as f:
                    self.data = json.load(f)
                    if "events" not in self.data:
                        self.data["events"] = []
                    if "subscribers" not in self.data:
                        self.data["subscribers"] = []
                    if "posts" not in self.data:
                        self.data["posts"] = {"feed": [], "chaos": [], "journey": []}
                    return
            except Exception as e:
                print(f"⚠️ Error reading local db file {self.file_path}: {e}")
        self.data = self._default_state()
        self._save()

    def _save(self):
        try:
            self.file_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.file_path, "w", encoding="utf-8") as f:
                json.dump(self.data, f, indent=2)
        except Exception as e:
            print(f"⚠️ Error saving local db to {self.file_path}: {e}")

    # ==================== SUBSCRIBER REPOSITORY ====================

    async def get_subscriber_count(self) -> int:
        return len(self.data.get("subscribers", []))

    async def get_subscribers(self) -> list[dict[str, Any]]:
        # Return sorted by timestamp desc
        subs = self.data.get("subscribers", [])
        return sorted(subs, key=lambda s: s.get("timestamp", 0), reverse=True)

    async def find_by_email(self, email: str) -> dict[str, Any] | None:
        if not email:
            return None
        clean_email = email.lower().strip()
        for s in self.data.get("subscribers", []):
            if s.get("email", "").lower().strip() == clean_email:
                return s
        return None

    async def find_by_referral_code(self, code: str) -> dict[str, Any] | None:
        if not code:
            return None
        clean_code = code.upper().strip()
        for s in self.data.get("subscribers", []):
            if (s.get("referralCode") or "").upper().strip() == clean_code:
                return s
        return None

    async def create_subscriber(
        self, email: str, name: str = "Backer", ref: str | None = None
    ) -> dict[str, Any]:
        clean_email = email.lower().strip()
        referral_code = generate_secure_referral_code(clean_email)
        # Collision defense (probabilistically near-zero with 1.1T space, capped at 3 retries)
        retries = 0
        while retries < 3 and any(
            s.get("referralCode") == referral_code for s in self.data.get("subscribers", [])
        ):
            referral_code = generate_secure_referral_code(clean_email)
            retries += 1

        now = int(time.time() * 1000)
        sub = {
            "id": f"sub_{now}",
            "email": email.lower().strip(),
            "name": name or "Backer",
            "referralCode": referral_code,
            "referredBy": ref if ref else None,
            "timestamp": now,
            "isVip": False,
            "depositAmount": 0.0,
            "friendsReferred": 0,
            "stripeChargeId": None,
            "stripeSessionId": None,
            "vipTimestamp": None,
            "unsubscribed": False,
            "unsubscribedAt": None,
        }
        self.data["subscribers"].append(sub)
        self._save()
        return sub

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
        target = None

        if email:
            target = await self.find_by_email(email)
        elif subscriber_id:
            for s in self.data["subscribers"]:
                if s.get("id") == subscriber_id:
                    target = s
                    break
        elif referral_code:
            target = await self.find_by_referral_code(referral_code)

        if not target and self.data["subscribers"]:
            target = self.data["subscribers"][-1]

        was_already_vip = False
        if target:
            was_already_vip = bool(target.get("isVip"))
            target["isVip"] = True
            target["depositAmount"] = float(amount)
            target["vipTimestamp"] = now
            target["stripeChargeId"] = charge_id
            if stripe_session_id:
                target["stripeSessionId"] = stripe_session_id
            self._save()

        return {
            "subscriber": target,
            "stripeChargeId": charge_id,
            "wasAlreadyVip": was_already_vip,
        }

    async def increment_referral_count(self, referral_code: str) -> dict[str, Any] | None:
        if not referral_code:
            return None
        clean_code = referral_code.upper().strip()
        for s in self.data["subscribers"]:
            if (s.get("referralCode") or "").upper().strip() == clean_code:
                s["friendsReferred"] = int(s.get("friendsReferred") or 0) + 1
                self._save()
                return s
        return None

    async def unsubscribe_user(self, email: str) -> dict[str, Any] | None:
        if not email:
            return None
        clean_email = email.lower().strip()
        now = int(time.time() * 1000)
        for s in self.data["subscribers"]:
            if s.get("email", "").lower().strip() == clean_email:
                s["unsubscribed"] = True
                s["unsubscribedAt"] = now
                self._save()
                return s
        # Create unsubscription stub if not found
        stub = {
            "id": f"sub_unsub_{now}",
            "email": clean_email,
            "name": "Unsubscribed Backer",
            "referralCode": generate_secure_referral_code(clean_email),
            "timestamp": now,
            "isVip": False,
            "depositAmount": 0.0,
            "friendsReferred": 0,
            "unsubscribed": True,
            "unsubscribedAt": now,
        }
        self.data["subscribers"].append(stub)
        self._save()
        return stub

    async def resubscribe_user(self, email: str) -> dict[str, Any] | None:
        if not email:
            return None
        clean_email = email.lower().strip()
        for s in self.data["subscribers"]:
            if s.get("email", "").lower().strip() == clean_email:
                s["unsubscribed"] = False
                s["unsubscribedAt"] = None
                self._save()
                return s
        return {"email": clean_email, "unsubscribed": False}

    # ==================== TELEMETRY REPOSITORY ====================

    async def log_event(self, event_data: dict[str, Any]) -> dict[str, Any]:
        now = int(time.time() * 1000)
        event = {
            "id": f"ev_{now}_"
            + "".join(random.choices(py_string.ascii_lowercase + py_string.digits, k=6)),
            "timestamp": now,
            "isoTime": time.strftime("%H:%M:%S", time.localtime()),
            **event_data,
        }
        if "events" not in self.data:
            self.data["events"] = []
        self.data["events"].append(event)
        if len(self.data["events"]) > 1000:
            self.data["events"].pop(0)
        self._save()
        return event

    async def get_metrics(self) -> dict[str, Any]:
        events = self.data.get("events", [])
        subscribers = self.data.get("subscribers", [])

        unique_visitors = len({e.get("visitorId") for e in events if e.get("visitorId")}) or 1
        unique_sessions = len({e.get("sessionId") for e in events if e.get("sessionId")}) or 1
        clicks = [e for e in events if e.get("type") == "click"]
        email_signups = len(subscribers)
        vip_deposits = len([s for s in subscribers if s.get("isVip")])

        conv_rate = round((email_signups / unique_visitors) * 100, 1) if unique_visitors > 0 else 0
        vip_rate = round((vip_deposits / email_signups) * 100, 1) if email_signups > 0 else 0

        # Funnel
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

        # Top Clicks
        click_counts: dict[str, int] = {}
        for c in clicks:
            c_data = c.get("data") or {}
            key = (c_data.get("label") or c_data.get("id") or c_data.get("tag") or "element")[:32]
            click_counts[key] = click_counts.get(key, 0) + 1
        top_clicks = sorted(click_counts.items(), key=lambda x: x[1], reverse=True)[:6]

        # Heatmap
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
            "recentEvents": list(reversed(events))[:30],
        }

    async def get_recent_events(self, limit: int = 50) -> list[dict[str, Any]]:
        events = self.data.get("events", [])
        return list(reversed(events))[:limit]

    # ==================== POSTS REPOSITORY ====================

    async def get_posts(self) -> dict[str, list[dict[str, Any]]]:
        return self.data.get("posts", {"feed": [], "chaos": [], "journey": []})

    async def create_post(self, category: str, post_data: dict[str, Any]) -> dict[str, Any]:
        now = int(time.time() * 1000)
        post = {
            "id": f"{category}_{now}",
            "timestamp": now,
            "category": category,
            **post_data,
        }
        if "posts" not in self.data:
            self.data["posts"] = {"feed": [], "chaos": [], "journey": []}
        if category not in self.data["posts"]:
            self.data["posts"][category] = []

        if category == "journey":
            self.data["posts"]["journey"].append(post)
        else:
            self.data["posts"][category].insert(0, post)

        self._save()
        return post

    async def react_to_post(
        self, category: str, post_id: str, reaction_type: str
    ) -> dict[str, Any] | None:
        posts_map = self.data.get("posts", {})
        post_list = posts_map.get(category, [])
        for p in post_list:
            if p.get("id") == post_id:
                if category == "feed":
                    p["likes"] = int(p.get("likes") or 0) + 1
                elif category == "chaos":
                    reactions = p.get("reactions") or {"rip": 0, "chaos": 0, "sip": 0}
                    reactions[reaction_type] = int(reactions.get(reaction_type, 0)) + 1
                    p["reactions"] = reactions
                self._save()
                return p
        return None
