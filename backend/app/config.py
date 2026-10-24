"""Application Configuration via Pydantic Settings."""

import os
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENV: str = "development"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    SITE_URL: str = "https://jeemu.fun"

    # Database
    DATA_ADAPTER: str = "auto"  # "postgres", "json", "auto"
    DATABASE_URL: Optional[str] = None
    SUPABASE_URL: Optional[str] = None
    SUPABASE_DB_URL: Optional[str] = None
    SUPABASE_SECRET_KEY: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    SUPABASE_PUBLISHABLE_KEY: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None

    # Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    DB_FILE: Path = BASE_DIR / "data" / "jeemu.db.json"

    # Stripe
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    # No default payment link: the old default pointed at a different Stripe account.
    STRIPE_PAYMENT_LINK: Optional[str] = None

    # Early-bird deposit step. OFF until you set DEPOSIT_ENABLED=true and confirm the terms below.
    DEPOSIT_ENABLED: bool = False
    DEPOSIT_AMOUNT_CENTS: int = 100
    DEPOSIT_PRODUCT_NAME: str = "Jeemu early-bird deposit"
    DEPOSIT_DESCRIPTION: str = "Reserves your place for the Jeemu Kickstarter early bird."

    # Hostinger SMTP
    SMTP_HOST: str = "smtp.hostinger.com"
    SMTP_PORT: int = 465
    SMTP_SECURE: bool = True
    SMTP_USER: str = "info@jeemu.fun"
    SMTP_PASS: Optional[str] = None
    HOSTINGER_EMAIL_PASS: Optional[str] = None
    EMAIL_FROM: Optional[str] = None

    # Resend API Fallback
    RESEND_API_KEY: Optional[str] = None
    RESEND_FROM: Optional[str] = None

    # Google Sheets Webhook
    GOOGLE_SHEET_WEBHOOK_URL: Optional[str] = None

    # Unsubscribe & Security
    UNSUBSCRIBE_SECRET: Optional[str] = None
    ADMIN_PASSWORD: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def effective_smtp_pass(self) -> Optional[str]:
        return self.SMTP_PASS or self.HOSTINGER_EMAIL_PASS

    @property
    def effective_from_email(self) -> str:
        return self.EMAIL_FROM or f"Jeemu <{self.SMTP_USER}>"

    @property
    def effective_unsubscribe_secret(self) -> str:
        return self.UNSUBSCRIBE_SECRET or self.ADMIN_PASSWORD or "jeemu-unsubscribe-salt-2026"

    @property
    def effective_database_url(self) -> Optional[str]:
        url = self.DATABASE_URL or self.SUPABASE_DB_URL
        if url and url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url


settings = Settings()
