"""Unsubscribe & Resubscribe Router."""

import contextlib
from pathlib import Path
from urllib.parse import unquote

from fastapi import APIRouter, Request, status
from fastapi.responses import HTMLResponse, RedirectResponse
from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.adapters import get_adapter
from app.adapters.google_sheets import GoogleSheetsAdapter
from app.adapters.smtp_email import verify_unsubscribe_token
from app.config import settings

router = APIRouter(tags=["unsubscribe"])

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"
jinja_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html", "xml"]),
)


def render_page(email: str, success: bool, message: str) -> str:
    template = jinja_env.get_template("unsubscribe_page.html")
    return template.render(
        email=email,
        success=success,
        message=message,
        site_url=settings.SITE_URL,
    )


@router.get("/unsubscribe", response_class=HTMLResponse)
async def unsubscribe(email: str | None = None, token: str | None = None):
    if not email:
        return HTMLResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=render_page(
                email="",
                success=False,
                message="Invalid unsubscribe link: Missing email address.",
            ),
        )

    clean_email = unquote(email).lower().strip()
    is_valid = bool(token and verify_unsubscribe_token(clean_email, token))

    if not is_valid and settings.ENV not in ("test", "development"):
        return HTMLResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content=render_page(
                email=clean_email,
                success=False,
                message="Invalid or expired unsubscribe link. Please contact info@jeemu.fun for assistance.",
            ),
        )

    adapter = get_adapter()
    sheets = GoogleSheetsAdapter()
    try:
        updated = await adapter.unsubscribe_user(clean_email)
        if updated:
            with contextlib.suppress(Exception):
                await sheets.sync_subscriber(updated, "unsubscribe")

        return HTMLResponse(
            status_code=status.HTTP_200_OK,
            content=render_page(
                email=clean_email,
                success=True,
                message="You have been successfully unsubscribed. You will no longer receive launch announcements or referral updates.",
            ),
        )
    except Exception:
        return HTMLResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=render_page(
                email=clean_email,
                success=False,
                message="An error occurred while updating your preferences. Please try again or email info@jeemu.fun.",
            ),
        )


@router.post("/resubscribe")
async def resubscribe(request: Request, email: str | None = None):
    target_email = email
    if not target_email:
        try:
            form_data = await request.form()
            target_email = form_data.get("email")
        except Exception:
            pass

    if not target_email:
        try:
            body = await request.json()
            target_email = body.get("email")
        except Exception:
            pass

    if not target_email:
        return RedirectResponse(url="/?resubscribed=0", status_code=status.HTTP_303_SEE_OTHER)

    clean_email = target_email.lower().strip()
    adapter = get_adapter()
    sheets = GoogleSheetsAdapter()
    try:
        updated = await adapter.resubscribe_user(clean_email)
        if updated:
            with contextlib.suppress(Exception):
                await sheets.sync_subscriber(updated, "resubscribe")
        return RedirectResponse(url="/?resubscribed=1", status_code=status.HTTP_303_SEE_OTHER)
    except Exception:
        return RedirectResponse(url="/", status_code=status.HTTP_303_SEE_OTHER)
