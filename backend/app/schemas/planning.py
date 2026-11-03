"""Shapes for the Planning station: frameworks and the PM's chosen approach."""

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
