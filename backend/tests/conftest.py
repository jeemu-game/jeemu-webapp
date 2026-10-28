"""Pytest fixtures for FastAPI TestClient and isolated repository state."""

import pytest
from fastapi.testclient import TestClient

from app.config import settings

settings.ENV = "test"

from app.adapters import set_adapter  # noqa: E402
from app.adapters.json_file import JsonFileAdapter  # noqa: E402
from app.main import app, rate_limit_history  # noqa: E402


@pytest.fixture(autouse=True)
def fresh_rate_limits():
    """Every test starts with empty rate-limit counters, so test volume never causes a 429."""
    rate_limit_history.clear()
    yield


@pytest.fixture(autouse=True)
def isolated_adapter(tmp_path):
    """Provides a fresh isolated JSON adapter for each test."""
    temp_db = tmp_path / "test_jeemu.db.json"
    adapter = JsonFileAdapter(file_path=temp_db)
    set_adapter(adapter)
    return adapter


@pytest.fixture
def client(isolated_adapter):
    """FastAPI In-Process TestClient."""
    with TestClient(app) as test_client:
        yield test_client
