"""Shapes for the hypothesis card: the current hypothesis, rejected ones, and the PM's actions."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

HypothesisStatus = Literal["draft", "accepted"]  # draft: still being shaped; accepted: PM signed off
Author = Literal["agent", "pm"]  # "pm" once the PM has written or edited it


class Hypothesis(BaseModel):
    """The current hypothesis, as stored in investigations.hypothesis."""

    statement: str  # the belief to test, e.g. "Customers asking for X mainly need Y"
    challenge_if: str  # what evidence would show it's wrong
    based_on: list[str]  # evidence labels the draft was based on (not test results)
    rationale: str | None  # the agent's one-line "why this hypothesis"; None if the PM wrote it
    status: HypothesisStatus
    written_by: Author
    framework_id: str | None  # the framework saved when it was made
    version: int  # 1, 2, 3... counts every hypothesis in this investigation, rejected ones too
    created_at: datetime
    updated_at: datetime


class RejectedHypothesis(Hypothesis):
    """A hypothesis the PM rejected, with their reason."""

    reason: str
    rejected_at: datetime


class HypothesisDraft(BaseModel):
    """What Claude returns when drafting a hypothesis (structured output)."""

    statement: str  # one or two sentences: the belief to test
    challenge_if: str  # concrete evidence that would show it's wrong
    based_on: list[str]  # labels of the evidence the draft rests on
    rationale: str  # one line: why this hypothesis, given the framework and evidence


class HypothesisEdit(BaseModel):
    """What the PM sends to write or edit the hypothesis."""

    model_config = ConfigDict(str_strip_whitespace=True)

    statement: str = Field(min_length=1)
    challenge_if: str = Field(min_length=1)


class RejectInput(BaseModel):
    """Why the PM rejected the hypothesis. Given to the agent when it drafts the next one."""

    model_config = ConfigDict(str_strip_whitespace=True)

    reason: str = Field(min_length=1)
