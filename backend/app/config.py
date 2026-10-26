"""Application Configuration via Pydantic Settings."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENV: str = "development"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    SITE_URL: str = "https://jeemu.fun"

    # Database
    DATA_ADAPTER: str = "auto"  # "postgres", "json", "auto"
    DATABASE_URL: str | None = None
    SUPABASE_URL: str | None = None
    SUPABASE_DB_URL: str | None = None
    SUPABASE_SECRET_KEY: str | None = None
    SUPABASE_SERVICE_ROLE_KEY: str | None = None
    SUPABASE_PUBLISHABLE_KEY: str | None = None
    SUPABASE_ANON_KEY: str | None = None

    # Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    DB_FILE: Path = BASE_DIR / "data" / "jeemu.db.json"

    # Stripe
    STRIPE_SECRET_KEY: str | None = None
    STRIPE_WEBHOOK_SECRET: str | None = None
    # No default payment link: the old default pointed at a different Stripe account.
    STRIPE_PAYMENT_LINK: str | None = None

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
    SMTP_PASS: str | None = None
    HOSTINGER_EMAIL_PASS: str | None = None
    EMAIL_FROM: str | None = None

    # Resend API Fallback
    RESEND_API_KEY: str | None = None
    RESEND_FROM: str | None = None

    # Google Sheets Webhook
    GOOGLE_SHEET_WEBHOOK_URL: str | None = None

    # Unsubscribe & Security
    UNSUBSCRIBE_SECRET: str | None = None
    ADMIN_PASSWORD: str | None = None
    ADMIN_EMAILS: str | None = None  # Comma-separated admin emails (e.g. info@jeemu.fun)
    # CORS & Trusted Origins
    ALLOWED_ORIGINS: str | None = None

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"), env_file_encoding="utf-8", extra="ignore"
    )

    @property
    def effective_smtp_pass(self) -> str | None:
        return self.SMTP_PASS or self.HOSTINGER_EMAIL_PASS

    @property
    def effective_from_email(self) -> str:
        return self.EMAIL_FROM or f"Jeemu <{self.SMTP_USER}>"

    @property
    def effective_unsubscribe_secret(self) -> str:
        sec = self.UNSUBSCRIBE_SECRET or self.ADMIN_PASSWORD
        if sec:
            return sec
        if self.ENV not in ("production", "prod"):
            return "jeemu-dev-unsubscribe-salt-2026-fallback"
        raise RuntimeError("UNSUBSCRIBE_SECRET must be configured in production environment.")

    @property
    def allowed_admin_emails(self) -> list[str]:
        if not self.ADMIN_EMAILS:
            return []
        return [e.strip().lower() for e in self.ADMIN_EMAILS.split(",") if e.strip()]

    @property
    def allowed_cors_origins(self) -> list[str]:
        origins = [
            "https://jeemu.fun",
            "https://www.jeemu.fun",
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000",
        ]
        if self.SITE_URL:
            clean_site = self.SITE_URL.rstrip("/")
            if clean_site not in origins:
                origins.append(clean_site)
        if self.ALLOWED_ORIGINS:
            for o in self.ALLOWED_ORIGINS.split(","):
                clean_o = o.strip().rstrip("/")
                if clean_o and clean_o not in origins:
                    origins.append(clean_o)
        return origins

    @property
    def effective_database_url(self) -> str | None:
        url = self.DATABASE_URL or self.SUPABASE_DB_URL
        if url and url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url


settings = Settings()
