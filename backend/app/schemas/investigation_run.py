"""Shapes for the Investigation station: one run's result and the proposed next experiment."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.hypothesis import Author
from app.schemas.planning import Confidence

# The PRD keeps evidence, interpretation, assumptions and missing information apart.
# Evidence is split in two so contradictions can't hide among supporting points.
FindingKind = Literal["supports", "contradicts", "interpretation", "assumption", "missing"]
Verdict = Literal["holds", "partly_holds", "does_not_hold"]
ExperimentStatus = Literal["proposed", "approved"]  # proposed: by the agent or edited; approved: PM signed off


class Finding(BaseModel):
    """One sentence the run found, of one kind, with the evidence labels it rests on."""

    kind: FindingKind
    statement: str
    evidence_refs: list[str]  # e.g. ["INT-02", "TKT-01"]; empty for most missing items


class ExperimentDraft(BaseModel):
    """A next experiment, as the agent proposes it (structured output)."""

    title: str  # a short name, e.g. "Interview mid-size accounts"
    experiment: str  # what to do, concretely
    why: str  # which finding, assumption or gap it resolves
    success_metric: str  # a measurable result with a threshold


class InvestigationAnswer(BaseModel):
    """What Claude returns when it runs the investigation (structured output)."""

    verdict: Verdict
    confidence: Confidence
    verdict_reason: str  # 2-3 sentences: why this verdict
    verdict_refs: list[str]  # labels the verdict rests on most
    findings: list[Finding]
    next_experiment: ExperimentDraft


class InvestigationRun(BaseModel):
    """The latest run, as stored in investigations.investigation_run."""

    verdict: Verdict
    confidence: Confidence
    verdict_reason: str
    verdict_refs: list[str]
    findings: list[Finding]
    # What really ran, so the activity log never claims more than happened.
    sources_read: list[str]  # labels of every checked source given to the agent
    framework_id: str
    hypothesis_version: int
    model: str
    duration_seconds: float
    ran_at: datetime


class NextExperiment(ExperimentDraft):
    """The current next experiment, as stored in investigations.next_experiment."""

    status: ExperimentStatus
    written_by: Author
    version: int  # 1, 2, 3... counts every experiment in this investigation, rejected ones too
    created_at: datetime
    updated_at: datetime


class RejectedExperiment(NextExperiment):
    """A next experiment the PM rejected, with their reason."""

    reason: str
    rejected_at: datetime


class ExperimentEdit(BaseModel):
    """What the PM sends to write or edit the next experiment."""

    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(min_length=1)
    experiment: str = Field(min_length=1)
    why: str = Field(min_length=1)
    success_metric: str = Field(min_length=1)
