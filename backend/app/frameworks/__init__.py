"""Loads the framework definitions (one YAML file each) when the backend starts.

If a file is missing a field, has a typo'd field name or isn't valid YAML, the
backend refuses to start and names the file, so a broken definition can never
reach the agent.
"""

from pathlib import Path

import yaml
from pydantic import ValidationError

from app.schemas.planning import Framework, FrameworkQuestion, PmQuestion

FOLDER = Path(__file__).parent

# Display order, as in the PM's wireframe. Every id must have a <id>.yaml file.
FRAMEWORK_ORDER = [
    "jobs_to_be_done",
    "steelman_vs_strawman",
    "five_whys",
    "assumption_mapping",
    "riskiest_assumption_test",
]


def _read_yaml(path: Path) -> dict:
    try:
        data = yaml.safe_load(path.read_text())
    except (OSError, yaml.YAMLError) as error:
        raise RuntimeError(f"Can't read framework file {path.name}: {error}") from error
    if not isinstance(data, dict):
        raise RuntimeError(f"Framework file {path.name} should contain named fields")
    return data


def _load() -> tuple[dict[str, PmQuestion], dict[str, Framework]]:
    """Read pm_inputs.yaml and every framework file, checking each against its schema."""
    questions: dict[str, PmQuestion] = {}
    for question_id, fields in _read_yaml(FOLDER / "pm_inputs.yaml").items():
        try:
            questions[question_id] = PmQuestion(**fields)
        except (TypeError, ValidationError) as error:
            raise RuntimeError(f"pm_inputs.yaml, question '{question_id}': {error}") from error

    frameworks: dict[str, Framework] = {}
    for framework_id in FRAMEWORK_ORDER:
        path = FOLDER / f"{framework_id}.yaml"
        data = _read_yaml(path)

        # Replace each {id, required} reference with the full shared question.
        used = []
        for ref in data.get("pm_inputs") or []:
            question = questions.get(ref.get("id"))
            if question is None:
                raise RuntimeError(
                    f"{path.name} uses PM question '{ref.get('id')}', "
                    "which isn't defined in pm_inputs.yaml"
                )
            used.append(
                FrameworkQuestion(**question.model_dump(), id=ref["id"], required=ref["required"])
            )
        data["pm_inputs"] = used

        try:
            frameworks[framework_id] = Framework(id=framework_id, **data)
        except (TypeError, ValidationError) as error:
            raise RuntimeError(f"Framework file {path.name} is invalid: {error}") from error

    return questions, frameworks


PM_QUESTIONS, FRAMEWORKS = _load()


def missing_required_answers(framework_id: str, answers: dict[str, str]) -> list[str]:
    """The required questions of this framework that have no (non-blank) answer."""
    framework = FRAMEWORKS[framework_id]
    return [
        q.question
        for q in framework.pm_inputs
        if q.required and not answers.get(q.id, "").strip()
    ]
