"""Shapes of feedback data going into and out of the API."""

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

# Must match the check constraints in migrations/001_create_feedback.sql.
SourceType = Literal["interview", "support_ticket", "metric", "document"]
Sentiment = Literal["positive", "neutral", "negative", "mixed"]
Urgency = Literal["low", "medium", "high", "critical"]


class FeedbackCreate(BaseModel):
    """What a client sends to add feedback. AI fields are not accepted here."""

    source_type: SourceType
    source_label: str = Field(min_length=1, examples=["INT-01"])
    title: str = Field(min_length=1)
    content: str = Field(min_length=1)
    customer_name: str | None = None
    customer_segment: str | None = None
    is_sample: bool = True
    metadata: dict[str, Any] = Field(default_factory=dict)
    occurred_at: datetime | None = None


class Feedback(FeedbackCreate):
    """What the API returns: everything above plus database-filled fields."""

    id: UUID
    created_at: datetime
    # Filled in later by the AI; null until then.
    theme: str | None
    sentiment: Sentiment | None
    urgency: Urgency | None
    analyzed_at: datetime | None
