"""Shapes for the Planning station: frameworks, the PM's chosen approach, and the agent's recommendation."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Mode = Literal["pick", "recommend"]  # "I'll pick a framework" / "Recommend one for me"


class PmQuestion(BaseModel):
    """An extra question for the PM, as defined in frameworks/pm_inputs.yaml."""

    model_config = ConfigDict(extra="forbid")  # a typo'd field name is an error, not ignored

    question: str = Field(min_length=1)
    help: str = ""
    agent_can_suggest: bool = False


class FrameworkQuestion(PmQuestion):
    """A PM question as one framework uses it: the shared definition plus its id and whether it's required."""

    id: str
    required: bool


class Framework(BaseModel):
    """One framework definition, loaded from its YAML file in app/frameworks/."""

    id: str  # the file name without .yaml, e.g. "jobs_to_be_done"
    name: str = Field(min_length=1)
    what: str = Field(min_length=1)
    use_when: str = Field(min_length=1)
    avoid_when: str = Field(min_length=1)
    questions_answered: list[str] = Field(min_length=1)
    required_inputs: list[str] = Field(min_length=1)
    procedure: list[str] = Field(min_length=1)
    expected_outputs: list[str] = Field(min_length=1)
    failure_modes: list[str] = Field(min_length=1)
    pm_inputs: list[FrameworkQuestion]


class ApproachInput(BaseModel):
    """The PM's chosen approach: how it was chosen, which framework, and answers to its questions."""

    mode: Mode
    framework_id: str
    # Answers keyed by question id. Answers to other frameworks' questions are kept too.
    framework_inputs: dict[str, str] = {}


# ---------- The agent's framework recommendation (mode B) ----------
# Claude must answer in exactly this shape (structured output). The backend then
# checks that every framework id and evidence label in it really exists.

Confidence = Literal["low", "medium", "high"]


class EvidencePoint(BaseModel):
    """Something the evidence shows, with the labels of the sources that show it."""

    statement: str
    evidence_refs: list[str]  # e.g. ["INT-01", "TKT-02"]


class WhyNot(BaseModel):
    """Why the agent didn't pick one of the other frameworks."""

    framework_id: str
    reason: str


class SuggestedAnswer(BaseModel):
    """A draft answer to a PM question. The PM must confirm or edit it."""

    question_id: str
    answer: str
    evidence_refs: list[str]


class FrameworkRecommendation(BaseModel):
    """What Claude returns. Evidence, interpretation, assumptions and gaps are kept apart."""

    evidence_found: list[EvidencePoint]  # what the sources say
    contradictions: list[EvidencePoint]  # evidence that points the other way
    diagnosis: str  # interpretation: what kind of problem this is
    framework_id: str
    why_fits: str
    will_uncover: list[str]
    assumptions: list[str]  # things taken as true without evidence
    context_gaps: list[str]  # missing information
    confidence: Confidence
    confidence_reason: str
    runner_up_id: str
    why_not: list[WhyNot]  # one for every framework except the recommended one
    suggested_answers: list[SuggestedAnswer]


class Recommendation(FrameworkRecommendation):
    """A recommendation as stored and returned: Claude's answer plus when and by which model."""

    model: str
    sources_read: list[str]  # labels of the checked evidence the agent was given
    created_at: datetime
