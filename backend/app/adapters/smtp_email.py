"""Hostinger SMTP Email Adapter using smtplib & Jinja2 templates."""

import email.utils
import hashlib
import hmac
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import Any
from urllib.parse import quote

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.config import settings

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"
jinja_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html", "xml"]),
)


def generate_unsubscribe_token(email: str, secret: str | None = None) -> str:
    if not email:
        return ""
    sec = (secret or settings.effective_unsubscribe_secret).encode("utf-8")
    clean = email.lower().strip().encode("utf-8")
    return hmac.new(sec, clean, hashlib.sha256).hexdigest()[:32]


def verify_unsubscribe_token(email: str, token: str, secret: str | None = None) -> bool:
    if not email or not token:
        return False
    expected = generate_unsubscribe_token(email, secret)
    return hmac.compare_digest(token, expected)


def get_unsubscribe_url(email: str, site_url: str | None = None) -> str:
    base = (site_url or settings.SITE_URL).rstrip("/")
    token = generate_unsubscribe_token(email)
    return f"{base}/api/unsubscribe?email={quote(email)}&token={token}"


class SmtpEmailAdapter:
    def __init__(self):
        self.host = settings.SMTP_HOST
        self.port = settings.SMTP_PORT
        self.user = settings.SMTP_USER
        self.password = settings.effective_smtp_pass
        self.from_email = settings.effective_from_email
        self.secure = settings.SMTP_SECURE

    def is_configured(self) -> bool:
        return bool(self.password)

    def verify_connection(self) -> dict[str, Any]:
        if not self.is_configured():
            return {
                "connected": False,
                "mode": "simulation",
                "message": "SMTP_PASS not set in .env. Emails are currently logged in simulation mode.",
            }
        try:
            if self.port == 465 or self.secure:
                context = ssl.create_default_context()
                with smtplib.SMTP_SSL(self.host, self.port, context=context, timeout=10) as server:
                    server.login(self.user, self.password)
            else:
                with smtplib.SMTP(self.host, self.port, timeout=10) as server:
                    server.starttls()
                    server.login(self.user, self.password)

            return {
                "connected": True,
                "mode": "live",
                "host": self.host,
                "port": self.port,
                "user": self.user,
                "message": f"Successfully connected and authenticated with Hostinger SMTP ({self.host}:{self.port})",
            }
        except Exception as e:
            return {
                "connected": False,
                "mode": "error",
                "host": self.host,
                "port": self.port,
                "user": self.user,
                "error": str(e),
            }

    def dispatch_mail(
        self,
        to: str,
        subject: str,
        html_content: str,
        text_content: str,
        unsubscribe_url: str | None = None,
    ) -> dict[str, Any]:
        clean_to = to.lower().strip()

        # Check simulation mode (always simulate during automated test runs)
        if not self.is_configured() or settings.ENV == "test":
            print("\n📧 [EMAIL SIMULATION — Add SMTP_PASS to .env]")
            print(f"   To: {clean_to}")
            print(f"   From: {self.from_email}")
            print(f"   Subject: {subject}")
            print(f"   Unsubscribe Link: {unsubscribe_url or 'N/A'}")
            print("-----------------------------------------------------------------\n")
            return {
                "success": True,
                "simulated": True,
                "messageId": f"sim_{email.utils.make_msgid()}",
            }

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = self.from_email
        msg["To"] = clean_to
        msg["Date"] = email.utils.formatdate(localtime=True)
        msg["Message-ID"] = email.utils.make_msgid(domain="jeemu.fun")
        if unsubscribe_url:
            msg["List-Unsubscribe"] = f"<{unsubscribe_url}>"

        part_text = MIMEText(text_content, "plain", "utf-8")
        part_html = MIMEText(html_content, "html", "utf-8")
        msg.attach(part_text)
        msg.attach(part_html)

        try:
            if self.port == 465 or self.secure:
                context = ssl.create_default_context()
                with smtplib.SMTP_SSL(self.host, self.port, context=context, timeout=12) as server:
                    server.login(self.user, self.password)
                    server.sendmail(self.user, [clean_to], msg.as_string())
            else:
                with smtplib.SMTP(self.host, self.port, timeout=12) as server:
                    server.starttls()
                    server.login(self.user, self.password)
                    server.sendmail(self.user, [clean_to], msg.as_string())

            print(f"✅ [EMAIL SENT via Hostinger] MessageId: {msg['Message-ID']} to {clean_to}")
            return {
                "success": True,
                "simulated": False,
                "provider": "hostinger",
                "messageId": msg["Message-ID"],
            }
        except Exception as e:
            print(f"❌ [EMAIL ERROR] Failed to send to {clean_to}: {e}")
            return {"success": False, "error": str(e)}

    async def send_signup_confirmation_email(self, subscriber: dict[str, Any]) -> dict[str, Any]:
        if not subscriber or not subscriber.get("email"):
            return {"success": False, "error": "Missing subscriber email"}

        if subscriber.get("unsubscribed"):
            print(f"⏭️ [EMAIL SKIPPED] {subscriber.get('email')} is unsubscribed.")
            return {"success": False, "skipped": True, "reason": "unsubscribed"}

        email_addr = subscriber.get("email")
        unsub_url = get_unsubscribe_url(email_addr)
        template = jinja_env.get_template("signup_confirmation.html")
        html = template.render(
            subscriber=subscriber,
            site_url=settings.SITE_URL,
            unsubscribe_url=unsub_url,
        )
        text = f"""You're on the Jeemu waitlist{", " + subscriber["name"] if subscriber.get("name") else ""}.

Jeemu launches on Kickstarter in November. Early-bird price: $89.99 USD. Early-bird backers also get a premium Jeemu bag.
We'll email you before the campaign opens.

Share your link: {settings.SITE_URL}/?ref={subscriber.get("referralCode")}

Unsubscribe: {unsub_url}
"""
        return self.dispatch_mail(
            to=email_addr,
            subject="You're on the Jeemu waitlist",
            html_content=html,
            text_content=text,
            unsubscribe_url=unsub_url,
        )

    async def send_referral_milestone_email(
        self, referrer: dict[str, Any], new_backer_name: str, new_count: int
    ) -> dict[str, Any]:
        if not referrer or not referrer.get("email"):
            return {"success": False, "error": "Missing referrer email"}

        if referrer.get("unsubscribed"):
            print(f"⏭️ [EMAIL SKIPPED] Referrer {referrer.get('email')} is unsubscribed.")
            return {"success": False, "skipped": True, "reason": "unsubscribed"}

        email_addr = referrer.get("email")
        unsub_url = get_unsubscribe_url(email_addr)
        template = jinja_env.get_template("referral_milestone.html")
        html = template.render(
            referrer=referrer,
            new_backer_name=new_backer_name or "A friend",
            new_count=new_count,
            site_url=settings.SITE_URL,
            unsubscribe_url=unsub_url,
        )
        text = f"""{new_backer_name or "A friend"} joined through your Jeemu link.
Friends who have joined so far: {new_count}

Share link: {settings.SITE_URL}/?ref={referrer.get("referralCode")}
Unsubscribe: {unsub_url}
"""
        return self.dispatch_mail(
            to=email_addr,
            subject="A friend joined via your Jeemu link",
            html_content=html,
            text_content=text,
            unsubscribe_url=unsub_url,
        )

    async def send_vip_deposit_receipt_email(
        self, subscriber: dict[str, Any], amount: float = 1.0, charge_id: str = ""
    ) -> dict[str, Any]:
        if not subscriber or not subscriber.get("email"):
            return {"success": False, "error": "Missing subscriber email"}

        email_addr = subscriber.get("email")
        unsub_url = get_unsubscribe_url(email_addr)
        template = jinja_env.get_template("vip_deposit_receipt.html")
        html = template.render(
            subscriber=subscriber,
            amount=amount,
            charge_id=charge_id,
            site_url=settings.SITE_URL,
            unsubscribe_url=unsub_url,
        )
        text = f"""Your Jeemu deposit receipt

Thank you{", " + subscriber["name"] if subscriber.get("name") else ""}.
Amount: ${amount:.2f} USD
Reference: {charge_id}
We launch on Kickstarter in November. Questions about your deposit? Just reply to this email.

Unsubscribe: {unsub_url}
"""
        return self.dispatch_mail(
            to=email_addr,
            subject=f"Your Jeemu deposit receipt (${amount:.2f} USD)",
            html_content=html,
            text_content=text,
            unsubscribe_url=unsub_url,
        )

    async def send_test_email(self, target_email: str) -> dict[str, Any]:
        test_sub = {
            "name": "Jeemu Explorer",
            "email": target_email,
            "referralCode": "JEEMU-TEST",
        }
        return await self.send_signup_confirmation_email(test_sub)
