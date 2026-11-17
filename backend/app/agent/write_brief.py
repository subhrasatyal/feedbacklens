"""Results chamber: Claude writes the decision brief's recommendation.

One quick Claude call, run when the PM clicks Generate brief. Everything else in
the brief is already saved and approved by the PM, so the agent adds only the
one new judgment: what to do about the original question. It reads the
investigation's findings (which already cite their sources), not the raw
evidence, so it can't drift from what the PM reviewed. It may only cite labels
that the findings or verdict already cite.
"""

from app.agent.claude_client import AgentError, ask_structured
from app.agent.recommend_framework import problem_text
from app.agent.redraft_experiment import run_text
from app.frameworks import FRAMEWORKS
from app.schemas.brief import BriefDraft

SYSTEM_PROMPT = """\
You are the research agent in The Product Lab, a workspace that helps a product
manager at an early-stage B2B SaaS company turn a vague product question into an
evidence-backed decision.

The investigation is finished and the PM has approved a next experiment. Write
the decision brief's recommendation: what the PM should do about their ORIGINAL
question, given everything below.

- The investigation's verdict is about the hypothesis. Your recommendation
  answers the original question (for example "should we build X?"). Be direct:
  build, don't build yet, build something narrower, or decide after the
  experiment, and say what.
- Base it only on the findings, verdict and approved experiment below. Weigh the
  contradicting findings and the missing information, not just the supporting
  ones. Don't add new facts.
- recommendation: one or two plain sentences (about 30 words).
- reasoning: at most 3 short, plain sentences (about 60 words) a busy
  executive can scan. Name the deciding points; don't list every finding.
- evidence_refs: the labels your reasoning rests on. Only use labels that appear
  in the findings or verdict below.
- confidence and confidence_reason: one short line on what limits it most.
- what_would_change: one sentence naming the result (ideally from the approved
  experiment) that would change your recommendation.

Never claim you searched, measured, interviewed or verified anything. The PM
makes the final call.
"""


def _framework_text(investigation: dict) -> str:
    framework_id = investigation["framework_id"]
    name = FRAMEWORKS[framework_id].name
    recommendation = investigation["recommendation"]
    if recommendation and recommendation["framework_id"] == framework_id:
        return f"{name}, recommended by the agent and accepted by the PM: {recommendation['why_fits']}"
    return f"{name}, picked by the PM."


def _experiment_text(experiment: dict) -> str:
    return (
        f"{experiment['title']}: {experiment['experiment']}\n"
        f"Why: {experiment['why']}\n"
        f"Success metric: {experiment['success_metric']}"
    )


def cited_labels(run: dict) -> set[str]:
    """Every label the investigation's verdict and findings cite."""
    labels = set(run["verdict_refs"])
    for finding in run["findings"]:
        labels.update(finding["evidence_refs"])
    return labels


def write_brief(investigation: dict) -> tuple[BriefDraft, str]:
    """Ask Claude for the brief's recommendation. Needs a run and an approved experiment.

    Returns the checked answer and the model that wrote it.
    """
    run = investigation["investigation_run"]
    prompt = (
        f"<problem>\n{problem_text(investigation)}\n</problem>\n\n"
        f"<framework>\n{_framework_text(investigation)}\n</framework>\n\n"
        f"<hypothesis>\n{investigation['hypothesis']['statement']}\n</hypothesis>\n\n"
        f"<investigation>\n{run_text(run)}\n</investigation>\n\n"
        f"<approved_experiment>\n{_experiment_text(investigation['next_experiment'])}\n</approved_experiment>\n\n"
        "Write the decision brief's recommendation."
    )

    # Medium effort: one short judgment from findings that already exist.
    draft, model = ask_structured(SYSTEM_PROMPT, prompt, BriefDraft, effort="medium")

    unknown = sorted(set(draft.evidence_refs) - cited_labels(run))
    if unknown:
        raise AgentError(
            f"The agent cited evidence the findings don't ({', '.join(unknown)}). Please regenerate."
        )
    parts = (draft.recommendation, draft.reasoning, draft.confidence_reason, draft.what_would_change)
    if not all(part.strip() for part in parts):
        raise AgentError("Part of the agent's recommendation was empty. Please regenerate.")
    return draft, model
