"""Admin routes: CSV Export, SMTP Diagnostics, Test Email, Batch Sync."""

import time

from fastapi import APIRouter, Depends, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.adapters import get_adapter
from app.adapters.google_sheets import GoogleSheetsAdapter
from app.adapters.smtp_email import SmtpEmailAdapter
from app.auth import require_supabase_auth
from app.config import settings

router = APIRouter(tags=["admin"], dependencies=[Depends(require_supabase_auth)])


class TestEmailRequest(BaseModel):
    targetEmail: str


@router.get("/admin/subscribers/export")
async def export_subscribers_csv():
    adapter = get_adapter()
    try:
        subscribers = await adapter.get_subscribers()
        csv_content = GoogleSheetsAdapter.generate_subscribers_csv(subscribers)
        filename = f"jeemu_subscribers_{int(time.time() * 1000)}.csv"
        return Response(
            content=csv_content,
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as e:
        print(f"Admin CSV export error: {e}")
        return JSONResponse(status_code=500, content={"error": "Failed to generate CSV export."})


@router.get("/admin/smtp-status")
async def get_smtp_status():
    email_adapter = SmtpEmailAdapter()
    sheets_adapter = GoogleSheetsAdapter()
    try:
        status = email_adapter.verify_connection()
        return {
            "smtpConfigured": bool(settings.effective_smtp_pass),
            "googleSheetsWebhookConfigured": sheets_adapter.is_configured(),
            "diagnostics": status,
        }
    except Exception as e:
        print(f"Admin SMTP status error: {e}")
        return JSONResponse(
            status_code=500, content={"error": "Failed to retrieve SMTP diagnostics."}
        )


@router.post("/admin/test-email")
async def send_test_email(payload: TestEmailRequest):
    if not payload.targetEmail or "@" not in payload.targetEmail:
        return JSONResponse(
            status_code=400, content={"error": "Please provide a valid targetEmail."}
        )

    email_adapter = SmtpEmailAdapter()
    try:
        result = await email_adapter.send_test_email(payload.targetEmail.strip())
        return {
            "success": result.get("success", False),
            "details": result,
        }
    except Exception as e:
        print(f"Admin test email error: {e}")
        return JSONResponse(status_code=500, content={"error": "Failed to send test email."})


@router.post("/admin/sync-google-sheet")
async def batch_sync_google_sheet():
    adapter = get_adapter()
    sheets_adapter = GoogleSheetsAdapter()
    try:
        subscribers = await adapter.get_subscribers()
        synced = 0
        for sub in subscribers:
            await sheets_adapter.sync_subscriber(sub, "batch_sync")
            synced += 1
        return {"success": True, "count": synced}
    except Exception as e:
        print(f"Admin Google Sheet sync error: {e}")
        return JSONResponse(
            status_code=500, content={"error": "Failed to sync subscribers to Google Sheet."}
        )
