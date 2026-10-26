"""Google Sheets Webhook Sync & CSV Export Adapter."""

from datetime import UTC, datetime
from typing import Any

import httpx

from app.config import settings


def format_subscriber_for_sheet(
    subscriber: dict[str, Any], event: str = "update"
) -> dict[str, Any]:
    ts = subscriber.get("timestamp")
    if ts:
        try:
            iso_time = datetime.fromtimestamp(float(ts) / 1000.0, tz=UTC).isoformat()
        except Exception:
            iso_time = datetime.now(UTC).isoformat()
    else:
        iso_time = datetime.now(UTC).isoformat()

    return {
        "event": event,
        "id": subscriber.get("id") or "",
        "name": subscriber.get("name") or "Friend",
        "email": (subscriber.get("email") or "").lower().strip(),
        "referralCode": subscriber.get("referralCode") or "",
        "referredBy": subscriber.get("referredBy") or "Direct",
        "friendsReferred": int(subscriber.get("friendsReferred") or 0),
        "isVip": "YES ($1.00)" if subscriber.get("isVip") else "NO",
        "depositAmount": float(subscriber.get("depositAmount") or 0.0),
        "stripeChargeId": subscriber.get("stripeChargeId") or "N/A",
        "unsubscribed": "YES" if subscriber.get("unsubscribed") else "NO",
        "timestamp": iso_time,
        "syncedAt": datetime.now(UTC).isoformat(),
    }


class GoogleSheetsAdapter:
    def __init__(self):
        self.webhook_url = settings.GOOGLE_SHEET_WEBHOOK_URL

    def is_configured(self) -> bool:
        return bool(self.webhook_url)

    async def sync_subscriber(
        self, subscriber: dict[str, Any], event: str = "signup"
    ) -> dict[str, Any]:
        if not self.is_configured() or settings.ENV == "test":
            return {"success": True, "simulated": True}

        payload = format_subscriber_for_sheet(subscriber, event)
        sec = settings.UNSUBSCRIBE_SECRET or settings.ADMIN_PASSWORD
        if sec:
            payload["secret"] = sec
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(self.webhook_url, json=payload)
                if res.status_code >= 400:
                    print(f"⚠️ [Google Sheets] Webhook responded with HTTP {res.status_code}")
                    return {"success": False, "status": res.status_code}
                print(f"📊 [Google Sheets] Successfully synced {payload['email']} ({event})")
                return {"success": True}
        except Exception as e:
            print(f"⚠️ [Google Sheets] Sync error: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def generate_subscribers_csv(subscribers: list[dict[str, Any]]) -> str:
        headers = [
            "Timestamp (ISO)",
            "Full Name",
            "Email Address",
            "Personal Referral Code",
            "Referred By",
            "Friends Referred",
            "VIP Deposit ($1)",
            "Deposit Amount (USD)",
            "Stripe Reference ID",
            "Unsubscribed",
        ]

        def escape_csv(val: Any) -> str:
            if val is None:
                return '""'
            s = str(val).replace('"', '""')
            return f'"{s}"'

        rows = []
        for s in subscribers:
            ts = s.get("timestamp")
            if ts:
                try:
                    time_str = datetime.fromtimestamp(float(ts) / 1000.0, tz=UTC).isoformat()
                except Exception:
                    time_str = ""
            else:
                time_str = ""

            row = [
                escape_csv(time_str),
                escape_csv(s.get("name") or "Friend"),
                escape_csv(s.get("email")),
                escape_csv(s.get("referralCode")),
                escape_csv(s.get("referredBy") or "Direct"),
                str(s.get("friendsReferred") or 0),
                '"YES"' if s.get("isVip") else '"NO"',
                f"{float(s.get('depositAmount') or 0.0):.2f}",
                escape_csv(s.get("stripeChargeId") or "N/A"),
                '"YES"' if s.get("unsubscribed") else '"NO"',
            ]
            rows.append(",".join(row))

        # Include UTF-8 BOM for Excel/Google Sheets auto-encoding
        return "\ufeff" + "\r\n".join([",".join(headers)] + rows)
