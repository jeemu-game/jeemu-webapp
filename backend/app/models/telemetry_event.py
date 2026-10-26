"""Telemetry Event SQLAlchemy & Pydantic models."""

import time
from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field
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


class TelemetryEventCreate(BaseModel):
    type: str = "unknown"
    visitorId: str | None = None
    sessionId: str | None = None
    url: str | None = None
    utm: dict[str, Any] | None = None
    dwellSeconds: int | None = 0
    data: dict[str, Any] | None = None

    model_config = ConfigDict(extra="allow")


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
