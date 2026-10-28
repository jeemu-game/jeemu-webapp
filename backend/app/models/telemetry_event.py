"""Telemetry Event SQLAlchemy & Pydantic models."""

import json
import time
from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import JSON, BigInteger, Column, DateTime, Integer, String

from app.models.subscriber import Base


class TelemetryEventModel(Base):
    __tablename__ = "telemetry_events"

    id = Column(String, primary_key=True)
    type = Column(String, nullable=False, index=True)
    timestamp = Column(
        BigInteger, default=lambda: int(time.time() * 1000), nullable=False, index=True
    )
    iso_time = Column(String, nullable=True)
    visitor_id = Column(String, nullable=True, index=True)
    session_id = Column(String, nullable=True)
    url = Column(String, nullable=True)
    utm = Column(JSON, default=dict)
    dwell_seconds = Column(Integer, default=0)
    data = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    def to_dict(self):
        return {
            "id": self.id,
            "type": self.type,
            "timestamp": int(self.timestamp) if self.timestamp else int(time.time() * 1000),
            "isoTime": self.iso_time,
            "visitorId": self.visitor_id,
            "sessionId": self.session_id,
            "url": self.url,
            "utm": self.utm or {},
            "dwellSeconds": int(self.dwell_seconds or 0),
            "data": self.data or {},
        }


# The analytics endpoint is public (browsers post to it), so every field is bounded.
MAX_EVENT_DATA_CHARS = 2048
MAX_UTM_KEYS = 20


class TelemetryEventCreate(BaseModel):
    type: str = Field(default="unknown", pattern=r"^[A-Za-z0-9_.:-]{1,64}$")
    visitorId: str | None = Field(default=None, max_length=128)
    sessionId: str | None = Field(default=None, max_length=128)
    url: str | None = None
    utm: dict[str, Any] | None = None
    dwellSeconds: int | None = Field(default=0, ge=0, le=60 * 60 * 24 * 30)
    data: dict[str, Any] | None = None

    model_config = ConfigDict(extra="ignore")

    @field_validator("url")
    @classmethod
    def _trim_url(cls, value: str | None) -> str | None:
        return value[:300] if value else value

    @field_validator("utm")
    @classmethod
    def _bound_utm(cls, value: dict[str, Any] | None) -> dict[str, Any] | None:
        if not value:
            return value
        return {str(k)[:64]: str(v)[:200] for k, v in list(value.items())[:MAX_UTM_KEYS]}

    @field_validator("data")
    @classmethod
    def _bound_data(cls, value: dict[str, Any] | None) -> dict[str, Any] | None:
        if value and len(json.dumps(value, default=str)) > MAX_EVENT_DATA_CHARS:
            raise ValueError(f"data must be at most {MAX_EVENT_DATA_CHARS} characters of JSON")
        return value


class TelemetryEventOut(BaseModel):
    id: str
    type: str
    timestamp: int
    isoTime: str | None = None
    visitorId: str | None = None
    sessionId: str | None = None
    url: str | None = None
    utm: dict[str, Any] = Field(default_factory=dict)
    dwellSeconds: int = 0
    data: dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)
