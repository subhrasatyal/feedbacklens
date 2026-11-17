"""Shapes for the Results chamber: the agent's recommendation and the PM's final decision."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, model_validator

from app.schemas.planning import Confidence

DecisionChoice = Literal["follow", "differ"]  # go with the recommendation / decide differently


class BriefDraft(BaseModel):
    """What Claude returns when writing the brief's recommendation (structured output)."""

    recommendation: str  # one or two sentences: what to do about the original question
    reasoning: str  # 2-3 sentences: why, drawn from the findings
    evidence_refs: list[str]  # labels the reasoning rests on (only labels the findings cite)
    confidence: Confidence
    confidence_reason: str  # one short line: what limits the confidence
    what_would_change: str  # one sentence: the result that would change the recommendation


class DecisionBrief(BriefDraft):
    """The recommendation as stored in investigations.decision_brief."""

    model: str
    generated_at: datetime
    # What it was written from, so the screen can warn when those have changed since.
    run_ran_at: datetime
    experiment_version: int
    experiment_updated_at: datetime


class DecisionInput(BaseModel):
    """The PM's final call. A note is required when deciding differently."""

    model_config = ConfigDict(str_strip_whitespace=True)

    choice: DecisionChoice
    note: str | None = None

    @model_validator(mode="after")
    def note_when_differing(self) -> "DecisionInput":
        self.note = self.note or None
        if self.choice == "differ" and self.note is None:
            raise ValueError("Say what you decided instead, and why")
        return self


class PmDecision(BaseModel):
    """The PM's final call, as stored in investigations.pm_decision."""

    choice: DecisionChoice
    note: str | None
    decided_at: datetime
