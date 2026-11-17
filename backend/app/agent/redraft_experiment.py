"""Recommend next step: Claude redrafts the next experiment after the PM rejects one.

One quick Claude call. It doesn't re-read the evidence: the investigation run
already turned it into findings (with their labels), so it gets the problem, the
accepted hypothesis, the latest run's verdict and findings, and every experiment
the PM rejected with their reason. Re-running the whole investigation would take
much longer and could change the findings the PM has already reviewed.
"""

from app.agent.claude_client import AgentError, ask_structured
from app.agent.recommend_framework import problem_text
from app.schemas.investigation_run import ExperimentDraft

SYSTEM_PROMPT = """\
You are the research agent in The Product Lab, a workspace that helps a product
manager at an early-stage B2B SaaS company turn a vague product question into an
evidence-backed decision.

You have already investigated the PM's hypothesis; your verdict and findings are
below. The PM rejected the next experiment you proposed. Propose ONE new next
experiment.

- Read the PM's reasons for every rejected experiment and address them. Do not
  propose the same experiment again in different words.
- It should resolve the most important missing information or riskiest
  assumption in the findings that the PM's constraints still allow.
- A small team should be able to run it in about two weeks.
- success_metric must be measurable and include a threshold (for example
  "3 of 5 interviewees describe it unprompted").
- why: one sentence linking it to the findings.
- title: a short name, about 6 words.
- Keep it short enough to scan on a card: experiment at most 3 plain
  sentences (about 60 words); success_metric one sentence with one clear
  threshold.

Never claim you searched, measured, interviewed or verified anything.
"""


def run_text(run: dict) -> str:
    lines = [
        f"Verdict: {run['verdict']} (confidence {run['confidence']})",
        f"Reason: {run['verdict_reason']}",
        "Findings:",
    ]
    for finding in run["findings"]:
        refs = ", ".join(finding["evidence_refs"]) or "no source"
        lines.append(f"- [{finding['kind']}] {finding['statement']} ({refs})")
    return "\n".join(lines)


def _rejected_text(rejected: list[dict]) -> str:
    return "\n".join(
        f'- v{item["version"]} "{item["title"]}": {item["experiment"]} '
        f'Success metric: {item["success_metric"]} Rejected because: {item["reason"]}'
        for item in rejected
    )


def redraft_experiment(investigation: dict) -> ExperimentDraft:
    """Ask Claude for a new next experiment. Needs a run and at least one rejected experiment."""
    hypothesis = investigation["hypothesis"]
    prompt = (
        f"<problem>\n{problem_text(investigation)}\n</problem>\n\n"
        f"<hypothesis>\n{hypothesis['statement']}\n</hypothesis>\n\n"
        f"<investigation>\n{run_text(investigation['investigation_run'])}\n</investigation>\n\n"
        f"<rejected_experiments>\n{_rejected_text(investigation['rejected_experiments'])}\n</rejected_experiments>\n\n"
        "Propose one new next experiment."
    )

    # Medium effort: one short proposal from findings that already exist.
    draft, _model = ask_structured(SYSTEM_PROMPT, prompt, ExperimentDraft, effort="medium")

    if not all(text.strip() for text in (draft.title, draft.experiment, draft.why, draft.success_metric)):
        raise AgentError("Part of the agent's experiment was empty. Please re-run.")
    return draft
