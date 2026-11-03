"""Shapes of investigation and evidence data going into and out of the API."""

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.planning import Mode

# Must match the check constraint in migrations/002_create_investigations.sql.
EvidenceType = Literal["interview", "support_ticket", "metric", "document", "other"]

# Longest evidence text accepted, in characters (roughly a 200 KB text file).
MAX_EVIDENCE_CHARS = 200_000


class InvestigationInput(BaseModel):
    """The problem or decision, as the PM fills it in. Used to create and to edit."""

    # Trim spaces from every text field, so "   " counts as blank.
    model_config = ConfigDict(str_strip_whitespace=True)

    question: str = Field(min_length=1)
    requested_by: str = Field(min_length=1)
    decision_deadline: date
    what_would_change: str | None = None

    @field_validator("what_would_change")
    @classmethod
    def blank_means_none(cls, value: str | None) -> str | None:
        """Store an empty optional answer as no answer."""
        return value or None


class Investigation(InvestigationInput):
    """What the API returns: the problem, the chosen approach (if any) and database-filled fields."""

    id: UUID
    # Planning station: empty until the PM saves an approach.
    mode: Mode | None
    framework_id: str | None
    framework_inputs: dict[str, str]
    created_at: datetime
    updated_at: datetime


class EvidenceCreate(BaseModel):
    """One piece of evidence for the specimen tray. The label is assigned by the backend."""

    model_config = ConfigDict(str_strip_whitespace=True)

    origin: str = Field(min_length=1)  # where it came from, e.g. "Customer"
    source_type: EvidenceType
    source_type_other: str | None = None
    title: str = Field(min_length=1)
    content: str = Field(min_length=1, max_length=MAX_EVIDENCE_CHARS)

    @model_validator(mode="after")
    def check_other_type(self) -> "EvidenceCreate":
        """'other' needs a name; any other type doesn't use one."""
        if self.source_type == "other":
            if not self.source_type_other:
                raise ValueError("Give the evidence type a name when choosing 'other'")
        else:
            self.source_type_other = None
        return self


class Evidence(BaseModel):
    """A saved piece of evidence, with its citation label (e.g. INT-01)."""

    id: UUID
    investigation_id: UUID
    source_label: str
    origin: str | None  # null only on evidence saved before origin existed
    source_type: EvidenceType
    source_type_other: str | None
    title: str
    content: str
    use_by_agent: bool  # the tray's Use checkbox: may the agent read this?
    created_at: datetime


class EvidenceUseUpdate(BaseModel):
    """Turn the Use checkbox on or off for one piece of evidence."""

    use_by_agent: bool


class InvestigationDetail(Investigation):
    """One investigation together with everything in its specimen tray."""

    evidence: list[Evidence]
