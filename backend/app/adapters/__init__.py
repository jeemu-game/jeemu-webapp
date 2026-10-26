"""Adapter factory and exports."""

from app.adapters.json_file import JsonFileAdapter
from app.adapters.postgres import PostgresAdapter
from app.adapters.supabase_rest import SupabaseRestAdapter
from app.config import settings

DatabaseAdapter = SupabaseRestAdapter | PostgresAdapter | JsonFileAdapter
_active_adapter: DatabaseAdapter | None = None


def get_adapter() -> DatabaseAdapter:
    global _active_adapter
    if _active_adapter is not None:
        return _active_adapter

    adapter_mode = settings.DATA_ADAPTER.lower().strip()

    if adapter_mode == "supabase":
        _active_adapter = SupabaseRestAdapter()
    elif adapter_mode == "postgres":
        _active_adapter = PostgresAdapter()
    elif adapter_mode == "json":
        _active_adapter = JsonFileAdapter()
    else:  # "auto"
        # 1. Prefer Supabase REST API if SUPABASE_URL and key are configured
        supabase_url = settings.SUPABASE_URL or settings.VITE_SUPABASE_URL
        supabase_key = (
            settings.SUPABASE_SECRET_KEY
            or settings.SUPABASE_SERVICE_ROLE_KEY
            or settings.SUPABASE_PUBLISHABLE_KEY
            or settings.SUPABASE_ANON_KEY
            or settings.VITE_SUPABASE_PUBLISHABLE_KEY
        )
        if supabase_url and supabase_key:
            print("[DB] Connected to Supabase REST API (quhpizadgfhhrdfompnm.supabase.co)")
            _active_adapter = SupabaseRestAdapter(
                supabase_url=supabase_url, supabase_key=supabase_key
            )

        # 2. Or Postgres connection string if configured
        elif settings.effective_database_url:
            print("[DB] Connected to PostgreSQL via SQLAlchemy")
            _active_adapter = PostgresAdapter()

        # 3. In test environment only, permit JsonFileAdapter
        elif settings.ENV == "test":
            _active_adapter = JsonFileAdapter()

        # 4. Strictly refuse silent fallback in dev or production
        else:
            raise RuntimeError(
                "[DB ERROR] No database configured! Please set SUPABASE_URL and SUPABASE_SECRET_KEY "
                "(or DATABASE_URL). Silent fallback to local JSON file is strictly disabled."
            )

    return _active_adapter


def set_adapter(adapter: DatabaseAdapter) -> None:
    """Override active adapter (useful for test isolation)."""
    global _active_adapter
    _active_adapter = adapter


__all__ = [
    "DatabaseAdapter",
    "SupabaseRestAdapter",
    "PostgresAdapter",
    "JsonFileAdapter",
    "get_adapter",
    "set_adapter",
]
