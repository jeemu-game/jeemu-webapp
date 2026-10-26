"""Post SQLAlchemy & Pydantic models."""

import time
from datetime import UTC, datetime

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import JSON, BigInteger, Column, DateTime, Integer, String

from app.models.subscriber import Base


class PostModel(Base):
    __tablename__ = "posts"

    id = Column(String, primary_key=True)
    category = Column(String, nullable=False, index=True)
    author = Column(String, nullable=False)
    role = Column(String, nullable=True)
    author_initials = Column(String, nullable=True)
    date = Column(String, nullable=True)
    title = Column(String, nullable=True)
    content = Column(String, nullable=True)
    image = Column(String, nullable=True)
    likes = Column(Integer, default=0)
    comments = Column(Integer, default=0)
    tag = Column(String, nullable=True)
    reactions = Column(JSON, default=lambda: {"rip": 0, "chaos": 0, "sip": 0})
    milestone = Column(String, nullable=True)
    description = Column(String, nullable=True)
    badge = Column(String, nullable=True)
    timestamp = Column(BigInteger, default=lambda: int(time.time() * 1000), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    def to_dict(self):
        return {
            "id": self.id,
            "category": self.category,
            "author": self.author,
            "role": self.role,
            "authorInitials": self.author_initials,
            "date": self.date,
            "title": self.title,
            "content": self.content,
            "image": self.image,
            "likes": int(self.likes or 0),
            "comments": int(self.comments or 0),
            "tag": self.tag,
            "reactions": self.reactions or {"rip": 0, "chaos": 0, "sip": 0},
            "milestone": self.milestone,
            "description": self.description,
            "badge": self.badge,
            "timestamp": int(self.timestamp) if self.timestamp else None,
        }


class PostCreate(BaseModel):
    category: str
    author: str | None = "Anonymous"
    role: str | None = None
    authorInitials: str | None = None
    date: str | None = None
    title: str | None = None
    content: str | None = None
    image: str | None = None
    likes: int | None = 0
    comments: int | None = 0
    tag: str | None = None
    reactions: dict[str, int] | None = None
    milestone: str | None = None
    description: str | None = None
    badge: str | None = None

    model_config = ConfigDict(extra="allow")


class PostOut(BaseModel):
    id: str
    category: str
    author: str
    role: str | None = None
    authorInitials: str | None = None
    date: str | None = None
    title: str | None = None
    content: str | None = None
    image: str | None = None
    likes: int = 0
    comments: int = 0
    tag: str | None = None
    reactions: dict[str, int] = Field(default_factory=lambda: {"rip": 0, "chaos": 0, "sip": 0})
    milestone: str | None = None
    description: str | None = None
    badge: str | None = None
    timestamp: int | None = None

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)
