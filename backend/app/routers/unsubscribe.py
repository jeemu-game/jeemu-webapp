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


def render_page(email: str, success: bool, message: str, token: str = "") -> str:
    template = jinja_env.get_template("unsubscribe_page.html")
    return template.render(
        email=email,
        success=success,
        message=message,
        token=token,
        site_url=settings.SITE_URL,
    )


def token_is_valid(email: str, token: str | None) -> bool:
    """Signed-link check. If no signing secret is configured nothing is valid (links are disabled)."""
    if not token:
        return False
    try:
        return verify_unsubscribe_token(email, token)
    except RuntimeError:
        return False


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

    if not token_is_valid(clean_email, token):
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
                token=token or "",
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
async def resubscribe(request: Request, email: str | None = None, token: str | None = None):
    target_email = email
    target_token = token
    if not target_email or not target_token:
        try:
            form_data = await request.form()
            target_email = target_email or form_data.get("email")
            target_token = target_token or form_data.get("token")
        except Exception:
            pass

    if not target_email or not target_token:
        try:
            body = await request.json()
            target_email = target_email or body.get("email")
            target_token = target_token or body.get("token")
        except Exception:
            pass

    if not target_email or not target_token:
        return RedirectResponse(url="/?resubscribed=0", status_code=status.HTTP_303_SEE_OTHER)

    clean_email = str(target_email).lower().strip()
    # Same signed token as the unsubscribe link: nobody can re-subscribe an address they don't own.
    if not token_is_valid(clean_email, str(target_token)):
        return RedirectResponse(url="/?resubscribed=0", status_code=status.HTTP_303_SEE_OTHER)

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
