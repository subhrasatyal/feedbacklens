"""Mode B: Claude diagnoses the problem and recommends one of the five frameworks.

One Claude call. It gets the problem, the framework definitions and only the
evidence the PM ticked Use for, and must answer in the FrameworkRecommendation
shape. Before anything is saved, the answer is checked: every framework id and
evidence label must really exist, so the agent can't cite evidence it wasn't given.
"""

from datetime import datetime, timezone

import yaml

from app.agent.claude_client import AgentError, ask_structured, evidence_text
from app.frameworks import FRAMEWORKS, PM_QUESTIONS
from app.schemas.planning import FrameworkRecommendation, Recommendation

SYSTEM_PROMPT = """\
You are the research agent in The Product Lab, a workspace that helps a product
manager at an early-stage B2B SaaS company turn a vague product question into an
evidence-backed decision.

Your task now is the planning step: diagnose what kind of problem this is, then
recommend which one of the five frameworks provided should be used to investigate
it. You are not running the investigation yet.

Rules:
- Use only the evidence provided. Cite it by its label (for example INT-01) and
  only use labels that appear in the evidence. Never claim you searched, measured
  or verified anything beyond reading what is provided.
- Keep four things apart: what the evidence shows (evidence_found), your
  interpretation (diagnosis), what you are taking as true without evidence
  (assumptions), and information that is missing (context_gaps).
- Include evidence that cuts against the obvious reading in contradictions. If
  there is none, leave it empty rather than inventing some.
- Make the rationale specific to this problem and this evidence, not a generic
  description of the framework.
- If the evidence is thin or one-sided, say so in context_gaps and lower your
  confidence. Low confidence is a fine answer when it is the honest one.
- runner_up_id must be a different framework from framework_id. why_not must have
  one entry for each framework other than the one you recommend.
- suggested_answers: for each question listed under "Questions you may draft
  answers for", draft an answer only if the evidence supports one, citing the
  labels. The PM will confirm or edit it. Skip a question rather than guess.
- Write in plain, direct language a busy PM can scan.
"""


def problem_text(investigation: dict) -> str:
    lines = [
        f"Question to investigate: {investigation['question']}",
        f"Asked by: {investigation['requested_by']}",
        f"Decision deadline: {investigation['decision_deadline']}",
    ]
    if investigation.get("what_would_change"):
        lines.append(f"What would change if we knew the answer: {investigation['what_would_change']}")
    for question_id, answer in (investigation.get("framework_inputs") or {}).items():
        if question_id in PM_QUESTIONS:
            lines.append(f"{PM_QUESTIONS[question_id].question} {answer}")
    return "\n".join(lines)


def _frameworks_text() -> str:
    # The PM's questions are left out: they're about running a framework, not choosing one.
    definitions = [f.model_dump(exclude={"pm_inputs"}) for f in FRAMEWORKS.values()]
    return yaml.safe_dump(definitions, sort_keys=False, allow_unicode=True)


def _suggestable_text() -> str:
    lines = [
        f"- {question_id}: {q.question}"
        for question_id, q in PM_QUESTIONS.items()
        if q.agent_can_suggest
    ]
    return "\n".join(lines)


def _check(answer: FrameworkRecommendation, labels: set[str]) -> None:
    """Reject an answer that names frameworks or evidence that don't exist."""
    problems = []
    if answer.framework_id not in FRAMEWORKS:
        problems.append(f"unknown framework '{answer.framework_id}'")
    if answer.runner_up_id not in FRAMEWORKS or answer.runner_up_id == answer.framework_id:
        problems.append(f"invalid runner-up '{answer.runner_up_id}'")
    others = set(FRAMEWORKS) - {answer.framework_id}
    if {w.framework_id for w in answer.why_not} != others:
        problems.append("missing or extra 'why not' reasons")

    cited = [ref for point in answer.evidence_found + answer.contradictions for ref in point.evidence_refs]
    cited += [ref for s in answer.suggested_answers for ref in s.evidence_refs]
    unknown_labels = sorted(set(cited) - labels)
    if unknown_labels:
        problems.append(f"cited evidence it wasn't given ({', '.join(unknown_labels)})")
    unknown_questions = [s.question_id for s in answer.suggested_answers if s.question_id not in PM_QUESTIONS]
    if unknown_questions:
        problems.append(f"answered unknown questions ({', '.join(unknown_questions)})")

    if problems:
        raise AgentError(
            "The agent's answer didn't pass our checks: " + "; ".join(problems) + ". Please re-run."
        )


def recommend_framework(investigation: dict, evidence: list[dict]) -> Recommendation:
    """Ask Claude for a recommendation. `evidence` must be only the checked (Use) evidence."""
    prompt = (
        f"<problem>\n{problem_text(investigation)}\n</problem>\n\n"
        f"<frameworks>\n{_frameworks_text()}</frameworks>\n\n"
        f"<evidence_tray>\n{evidence_text(evidence)}\n</evidence_tray>\n\n"
        f"Questions you may draft answers for:\n{_suggestable_text()}\n\n"
        "Diagnose the problem and recommend a framework."
    )

    answer, model = ask_structured(SYSTEM_PROMPT, prompt, FrameworkRecommendation)

    labels = {item["source_label"] for item in evidence}
    _check(answer, labels)
    return Recommendation(
        **answer.model_dump(),
        model=model,
        sources_read=sorted(labels),
        created_at=datetime.now(timezone.utc),
    )
