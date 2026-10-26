"""Resend Email API Adapter fallback."""

from typing import Any

import httpx

from app.config import settings


class ResendEmailAdapter:
    def __init__(self):
        self.api_key = settings.RESEND_API_KEY
        self.from_email = settings.RESEND_FROM or settings.effective_from_email

    def is_configured(self) -> bool:
        return bool(self.api_key)

    async def send_mail(
        self,
        to: str,
        subject: str,
        html_content: str,
        text_content: str,
        unsubscribe_url: str | None = None,
    ) -> dict[str, Any]:
        if not self.is_configured():
            return {"success": False, "error": "RESEND_API_KEY not configured"}

        clean_to = to.lower().strip()
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        body: dict[str, Any] = {
            "from": self.from_email,
            "to": [clean_to],
            "subject": subject,
            "html": html_content,
            "text": text_content,
        }
        if unsubscribe_url:
            body["headers"] = {"List-Unsubscribe": f"<{unsubscribe_url}>"}

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post("https://api.resend.com/emails", json=body, headers=headers)
                data = res.json()
                if res.status_code >= 400:
                    err_msg = data.get("message") or str(data)
                    return {"success": False, "error": err_msg}

                msg_id = data.get("id")
                print(f"✅ [EMAIL SENT via Resend] MessageId: {msg_id} to {clean_to}")
                return {
                    "success": True,
                    "simulated": False,
                    "provider": "resend",
                    "messageId": msg_id,
                }
        except Exception as e:
            print(f"⚠️ [Resend Dispatch Error] {e}")
            return {"success": False, "error": str(e)}
