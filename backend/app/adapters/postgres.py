"""SQLAlchemy PostgreSQL Repository Adapter."""

import random
import string
import string as py_string
import time
from typing import Any, Dict, List, Optional
from sqlalchemy import create_engine, desc, func, select, update
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.models.subscriber import Base, SubscriberModel
from app.models.telemetry_event import TelemetryEventModel
from app.models.post import PostModel


def _generate_referral_code() -> str:
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"JEEMU-{suffix}"


class PostgresAdapter:
    def __init__(self, db_url: Optional[str] = None):
        self.db_url = db_url or settings.effective_database_url
        if not self.db_url:
            raise ValueError("No database URL provided for PostgresAdapter.")
        self.engine = create_engine(self.db_url, pool_pre_ping=True, pool_size=5, max_overflow=10)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        # Create tables if not exist
        try:
            Base.metadata.create_all(bind=self.engine)
        except Exception as e:
            print(f"⚠️ PostgresAdapter table creation warning: {e}")

    # ==================== SUBSCRIBERS ====================

    async def get_subscriber_count(self) -> int:
        with self.SessionLocal() as session:
            count = session.query(func.count(SubscriberModel.id)).scalar()
            return count or 0

    async def get_subscribers(self) -> List[Dict[str, Any]]:
        with self.SessionLocal() as session:
            stmt = select(SubscriberModel).order_by(desc(SubscriberModel.timestamp))
            rows = session.scalars(stmt).all()
            return [r.to_dict() for r in rows]

    async def find_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        if not email:
            return None
        clean_email = email.lower().strip()
        with self.SessionLocal() as session:
            stmt = select(SubscriberModel).where(func.lower(SubscriberModel.email) == clean_email)
            row = session.scalars(stmt).first()
            return row.to_dict() if row else None

    async def find_by_referral_code(self, code: str) -> Optional[Dict[str, Any]]:
        if not code:
            return None
        clean_code = code.upper().strip()
        with self.SessionLocal() as session:
            stmt = select(SubscriberModel).where(func.upper(SubscriberModel.referral_code) == clean_code)
            row = session.scalars(stmt).first()
            return row.to_dict() if row else None

    async def create_subscriber(
        self, email: str, name: str = "Backer", ref: Optional[str] = None
    ) -> Dict[str, Any]:
        referral_code = _generate_referral_code()
        now = int(time.time() * 1000)
        with self.SessionLocal() as session:
            # Check unique referral code
            while session.query(SubscriberModel).filter_by(referral_code=referral_code).first():
                referral_code = _generate_referral_code()

            sub = SubscriberModel(
                id=f"sub_{now}",
                email=email.lower().strip(),
                name=name or "Backer",
                referral_code=referral_code,
                referred_by=ref if ref else None,
                timestamp=now,
                is_vip=False,
                deposit_amount=0.0,
                friends_referred=0,
                unsubscribed=False,
            )
            session.add(sub)
            session.commit()
            session.refresh(sub)
            return sub.to_dict()

    async def mark_subscriber_vip(
        self,
        subscriber_id: Optional[str] = None,
        referral_code: Optional[str] = None,
        email: Optional[str] = None,
        amount: float = 1.0,
        stripe_session_id: Optional[str] = None,
        stripe_payment_intent: Optional[str] = None,
    ) -> Dict[str, Any]:
        charge_id = stripe_payment_intent or (
            "ch_3M" + "".join(random.choices(py_string.ascii_letters + py_string.digits, k=9)) + "StripeJeemu"
        )
        now = int(time.time() * 1000)
        with self.SessionLocal() as session:
            query = session.query(SubscriberModel)
            if email:
                query = query.filter(func.lower(SubscriberModel.email) == email.lower().strip())
            elif subscriber_id:
                query = query.filter_by(id=subscriber_id)
            elif referral_code:
                query = query.filter(func.upper(SubscriberModel.referral_code) == referral_code.upper().strip())
            else:
                query = query.order_by(desc(SubscriberModel.timestamp))

            target = query.first()
            was_already_vip = False
            if target:
                was_already_vip = bool(target.is_vip)
                target.is_vip = True
                target.deposit_amount = float(amount)
                target.vip_timestamp = now
                target.stripe_charge_id = charge_id
                if stripe_session_id:
                    target.stripe_session_id = stripe_session_id
                session.commit()
                session.refresh(target)
                return {
                    "subscriber": target.to_dict(),
                    "stripeChargeId": charge_id,
                    "wasAlreadyVip": was_already_vip,
                }
            return {
                "subscriber": None,
                "stripeChargeId": charge_id,
                "wasAlreadyVip": False,
            }

    async def increment_referral_count(self, referral_code: str) -> Optional[Dict[str, Any]]:
        if not referral_code:
            return None
        clean_code = referral_code.upper().strip()
        with self.SessionLocal() as session:
            target = session.query(SubscriberModel).filter(
                func.upper(SubscriberModel.referral_code) == clean_code
            ).first()
            if target:
                target.friends_referred = int(target.friends_referred or 0) + 1
                session.commit()
                session.refresh(target)
                return target.to_dict()
            return None

    async def unsubscribe_user(self, email: str) -> Optional[Dict[str, Any]]:
        if not email:
            return None
        clean_email = email.lower().strip()
        now = int(time.time() * 1000)
        with self.SessionLocal() as session:
            target = session.query(SubscriberModel).filter(
                func.lower(SubscriberModel.email) == clean_email
            ).first()
            if target:
                target.unsubscribed = True
                target.unsubscribed_at = now
                session.commit()
                session.refresh(target)
                return target.to_dict()
            # If not exists, insert unsubscribed stub
            stub = SubscriberModel(
                id=f"sub_unsub_{now}",
                email=clean_email,
                name="Unsubscribed Backer",
                referral_code=_generate_referral_code(),
                timestamp=now,
                is_vip=False,
                deposit_amount=0.0,
                friends_referred=0,
                unsubscribed=True,
                unsubscribed_at=now,
            )
            session.add(stub)
            session.commit()
            session.refresh(stub)
            return stub.to_dict()

    async def resubscribe_user(self, email: str) -> Optional[Dict[str, Any]]:
        if not email:
            return None
        clean_email = email.lower().strip()
        with self.SessionLocal() as session:
            target = session.query(SubscriberModel).filter(
                func.lower(SubscriberModel.email) == clean_email
            ).first()
            if target:
                target.unsubscribed = False
                target.unsubscribed_at = None
                session.commit()
                session.refresh(target)
                return target.to_dict()
            return {"email": clean_email, "unsubscribed": False}

    # ==================== TELEMETRY ====================

    async def log_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        now = int(time.time() * 1000)
        event_id = f"ev_{now}_" + "".join(random.choices(py_string.ascii_lowercase + py_string.digits, k=6))
        with self.SessionLocal() as session:
            ev = TelemetryEventModel(
                id=event_id,
                type=event_data.get("type", "unknown"),
                timestamp=now,
                iso_time=time.strftime("%H:%M:%S", time.localtime()),
                visitor_id=event_data.get("visitorId"),
                session_id=event_data.get("sessionId"),
                url=event_data.get("url"),
                utm=event_data.get("utm", {}),
                dwell_seconds=int(event_data.get("dwellSeconds", 0) or 0),
                data=event_data.get("data", {}),
            )
            session.add(ev)
            session.commit()
            session.refresh(ev)
            return ev.to_dict()

    async def get_metrics(self) -> Dict[str, Any]:
        with self.SessionLocal() as session:
            events_stmt = select(TelemetryEventModel).order_by(desc(TelemetryEventModel.timestamp)).limit(500)
            events = [e.to_dict() for e in session.scalars(events_stmt).all()]

            subs_stmt = select(SubscriberModel)
            subscribers = [s.to_dict() for s in session.scalars(subs_stmt).all()]

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
                "vipViewed": len([
                    e for e in events
                    if e.get("type") == "view_vip_modal"
                    or (e.get("data") and e.get("data", {}).get("id") == "btn-open-vip-nav")
                ]) + (1 if vip_deposits > 0 else 0),
                "vipReserved": vip_deposits,
                "shared": len([e for e in events if e.get("type") in ("referral_link_copied", "share_click")]),
            }

            click_counts: Dict[str, int] = {}
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

    async def get_recent_events(self, limit: int = 50) -> List[Dict[str, Any]]:
        with self.SessionLocal() as session:
            stmt = select(TelemetryEventModel).order_by(desc(TelemetryEventModel.timestamp)).limit(limit)
            return [e.to_dict() for e in session.scalars(stmt).all()]

    # ==================== POSTS ====================

    async def get_posts(self) -> Dict[str, List[Dict[str, Any]]]:
        with self.SessionLocal() as session:
            stmt = select(PostModel).order_by(desc(PostModel.created_at))
            rows = session.scalars(stmt).all()
            posts: Dict[str, List[Dict[str, Any]]] = {"feed": [], "chaos": [], "journey": []}
            for p in rows:
                p_dict = p.to_dict()
                cat = p.category
                if cat in posts:
                    posts[cat].append(p_dict)
            posts["journey"].sort(key=lambda x: x.get("timestamp") or 0)
            return posts

    async def create_post(self, category: str, post_data: Dict[str, Any]) -> Dict[str, Any]:
        now = int(time.time() * 1000)
        with self.SessionLocal() as session:
            post = PostModel(
                id=f"{category}_{now}",
                category=category,
                author=post_data.get("author", "Anonymous"),
                role=post_data.get("role"),
                author_initials=post_data.get("authorInitials"),
                date=post_data.get("date", "Today"),
                title=post_data.get("title"),
                content=post_data.get("content"),
                image=post_data.get("image"),
                likes=int(post_data.get("likes", 0) or 0),
                comments=int(post_data.get("comments", 0) or 0),
                tag=post_data.get("tag"),
                reactions=post_data.get("reactions") or {"rip": 0, "chaos": 0, "sip": 0},
                milestone=post_data.get("milestone"),
                description=post_data.get("description"),
                badge=post_data.get("badge"),
                timestamp=now,
            )
            session.add(post)
            session.commit()
            session.refresh(post)
            return post.to_dict()

    async def react_to_post(
        self, category: str, post_id: str, reaction_type: str
    ) -> Optional[Dict[str, Any]]:
        with self.SessionLocal() as session:
            post = session.query(PostModel).filter_by(id=post_id).first()
            if post:
                if category == "feed":
                    post.likes = int(post.likes or 0) + 1
                elif category == "chaos":
                    reactions = dict(post.reactions or {"rip": 0, "chaos": 0, "sip": 0})
                    reactions[reaction_type] = int(reactions.get(reaction_type, 0)) + 1
                    post.reactions = reactions
                session.commit()
                session.refresh(post)
                return post.to_dict()
            return None
