"""Pytest fixtures for FastAPI TestClient and isolated repository state."""

import json
import os
import tempfile
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from app.config import settings
settings.ENV = "test"

from app.adapters import set_adapter
from app.adapters.json_file import JsonFileAdapter
from app.main import app


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
