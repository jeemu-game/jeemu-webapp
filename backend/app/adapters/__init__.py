"""Adapter factory and exports."""

from typing import Union
from app.config import settings
from app.adapters.json_file import JsonFileAdapter
from app.adapters.postgres import PostgresAdapter

_active_adapter: Union[JsonFileAdapter, PostgresAdapter, None] = None


def get_adapter() -> Union[JsonFileAdapter, PostgresAdapter]:
    global _active_adapter
    if _active_adapter is not None:
        return _active_adapter

    if settings.DATA_ADAPTER == "postgres":
        _active_adapter = PostgresAdapter()
    elif settings.DATA_ADAPTER == "json":
        _active_adapter = JsonFileAdapter()
    else:  # "auto"
        if settings.effective_database_url:
            try:
                _active_adapter = PostgresAdapter()
            except Exception as e:
                print(f"⚠️ Failed to connect to Postgres ({e}), falling back to JSON file adapter.")
                _active_adapter = JsonFileAdapter()
        else:
            _active_adapter = JsonFileAdapter()

    return _active_adapter


def set_adapter(adapter: Union[JsonFileAdapter, PostgresAdapter]) -> None:
    """Override active adapter (useful for test isolation)."""
    global _active_adapter
    _active_adapter = adapter


__all__ = ["JsonFileAdapter", "PostgresAdapter", "get_adapter", "set_adapter"]
