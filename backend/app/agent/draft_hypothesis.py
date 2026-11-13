"""Form hypothesis: Claude turns the question into one testable hypothesis.

One Claude call. It gets the problem and the PM's answers, the chosen framework,
the agent's earlier diagnosis (if there is one), only the evidence the PM ticked
Use for, and every hypothesis the PM rejected with their reason. The answer is
checked before it's saved: it may only cite evidence labels it was given.
"""

import yaml

from app.agent.claude_client import AgentError, ask_structured, evidence_text
from app.agent.recommend_framework import problem_text
from app.frameworks import FRAMEWORKS
from app.schemas.hypothesis import HypothesisDraft

SYSTEM_PROMPT = """\
You are the research agent in The Product Lab, a workspace that helps a product
manager at an early-stage B2B SaaS company turn a vague product question into an
evidence-backed decision.

Your task now is the "form hypothesis" step: turn the PM's question into ONE
testable hypothesis, using the chosen framework as your lens. You are not
investigating it yet; the next step will test it against the evidence.

A good hypothesis here:
- States a belief about customers' need, behaviour or situation that the
  evidence could support or contradict. It does not simply restate the requested
  solution (e.g. "customers want an AI chatbot").
- Fits the chosen framework. For example, with Jobs to Be Done it names the job
  customers are trying to get done; with Five Whys, a suspected root cause.
- Is specific enough to test: who it is about and what would be true.
- Makes ONE central claim, in at most two plain sentences (about 40 words).
  Don't bundle several claims; the investigation can raise others later.

challenge_if: one or two sentences (about 40 words) naming the concrete
evidence that would show the hypothesis is wrong, something the investigation
could actually look for in customer evidence. Do not make it impossible to meet.

based_on: the labels (for example INT-01) of the evidence that led you to this
hypothesis. Only use labels that appear in the evidence. This is what prompted
the hypothesis, not proof of it.

rationale: one sentence on why this hypothesis is the right one to test first.

If the PM rejected earlier hypotheses, read their reasons and do not propose the
same idea again. Address what the reason asks for.

Never claim you searched, measured or verified anything. The hypothesis is a
proposition to investigate, not a finding.
"""


def _framework_text(framework_id: str) -> str:
    # The PM's questions are left out: their answers are already in the problem text.
    definition = FRAMEWORKS[framework_id].model_dump(exclude={"pm_inputs"})
    return yaml.safe_dump(definition, sort_keys=False, allow_unicode=True)


def _diagnosis_text(recommendation: dict | None) -> str:
    """The agent's earlier diagnosis from the Planning station, if it ran."""
    if not recommendation:
        return "None: the PM picked the framework without asking the agent to diagnose."
    gaps = "\n".join(f"- {gap}" for gap in recommendation["context_gaps"]) or "- none listed"
    return f"Diagnosis: {recommendation['diagnosis']}\nContext gaps:\n{gaps}"


def _rejected_text(rejected: list[dict]) -> str:
    if not rejected:
        return "None yet."
    return "\n".join(
        f'- v{item["version"]}: "{item["statement"]}" Rejected because: {item["reason"]}'
        for item in rejected
    )


def draft_hypothesis(investigation: dict, evidence: list[dict]) -> HypothesisDraft:
    """Ask Claude for a hypothesis. `evidence` must be only the checked (Use) evidence.

    Returns the draft once it has passed the checks below.
    """
    prompt = (
        f"<problem>\n{problem_text(investigation)}\n</problem>\n\n"
        f"<framework>\n{_framework_text(investigation['framework_id'])}</framework>\n\n"
        f"<earlier_diagnosis>\n{_diagnosis_text(investigation['recommendation'])}\n</earlier_diagnosis>\n\n"
        f"<rejected_hypotheses>\n{_rejected_text(investigation['rejected_hypotheses'])}\n</rejected_hypotheses>\n\n"
        f"<evidence_tray>\n{evidence_text(evidence)}\n</evidence_tray>\n\n"
        "Draft one testable hypothesis."
    )

    # Medium effort: a single hypothesis needs less deliberation than choosing among
    # five frameworks, and the PM is waiting on the answer.
    draft, _model = ask_structured(SYSTEM_PROMPT, prompt, HypothesisDraft, effort="medium")

    labels = {item["source_label"] for item in evidence}
    unknown = sorted(set(draft.based_on) - labels)
    if unknown:
        raise AgentError(
            f"The agent cited evidence it wasn't given ({', '.join(unknown)}). Please re-run."
        )
    if not draft.statement.strip() or not draft.challenge_if.strip():
        raise AgentError("The agent's hypothesis was empty. Please re-run.")
    return draft
