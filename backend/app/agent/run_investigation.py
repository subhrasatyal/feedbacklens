"""Investigate: Claude tests the accepted hypothesis against the evidence.

One Claude call, run only after the PM clicks Run investigation (that click is
the approval). It gets the problem, the saved framework (including its procedure
and expected outputs, which are the method for this step), the accepted
hypothesis, the earlier diagnosis and only the evidence the PM ticked Use for.

It answers with a verdict, findings sorted into five kinds, and one proposed
next experiment. The answer is checked before it's saved: it may only cite
evidence labels it was given, and evidence findings must cite something.
"""

import time

from app.agent.claude_client import AgentError, ask_structured, evidence_text
from app.agent.draft_hypothesis import diagnosis_text, framework_text
from app.agent.recommend_framework import problem_text
from app.schemas.investigation_run import InvestigationAnswer

SYSTEM_PROMPT = """\
You are the research agent in The Product Lab, a workspace that helps a product
manager at an early-stage B2B SaaS company turn a vague product question into an
evidence-backed decision.

Your task now is the investigation step: test the PM's accepted hypothesis
against the evidence provided, using the chosen framework as your method.

How to work:
- Follow the framework's procedure, step by step, against this evidence, and
  aim for its expected outputs. That is what makes this step different from the
  earlier diagnosis: the diagnosis chose the lens; you now use it to test one
  claim. Don't just restate the earlier diagnosis; go further than it.
- Look specifically for the evidence named in "would challenge it if". If you
  find it, it is a contradiction and must be reported.
- Read every source. Report evidence that cuts against the hypothesis as
  readily as evidence that supports it. Never cherry-pick.

Findings: about 4 to 8, no duplicates. Each is at most two short, plain
sentences (about 35 words): the point first, then at most one short quote or
number if it matters. Each has a kind:
- supports: what a source says that backs the hypothesis. Facts from the
  evidence (who said what, counts you can see), not your reading of them.
  Must cite at least one label.
- contradicts: what a source says that cuts against the hypothesis, or shows it
  holds only for some customers. Must cite at least one label.
- interpretation: your reading of what the evidence means. Cite the labels it
  rests on.
- assumption: something the conclusion depends on that the evidence does not
  show. Cite labels only if it concerns specific sources.
- missing: information that is not in the evidence and would change the
  verdict or the decision. No labels.

Verdict: holds, partly_holds or does_not_hold, with confidence low, medium or
high. Lower the confidence when evidence is thin, comes from few customers, or
key information is missing. verdict_reason: 2 or 3 plain sentences a busy PM
can scan. verdict_refs: the labels the verdict rests on most.

next_experiment: ONE focused experiment that would resolve the most important
missing information or riskiest assumption you found. A small team should be
able to run it in about two weeks with the customers they have. success_metric
must be measurable and include a threshold (for example "3 of 5 interviewees
describe it unprompted"). why: one sentence linking it to your findings.

Only use evidence labels that appear in the evidence. Never claim you searched,
measured, interviewed or verified anything: you only read what is provided.
"""


def _hypothesis_text(hypothesis: dict) -> str:
    return (
        f"Hypothesis (v{hypothesis['version']}): {hypothesis['statement']}\n"
        f"Would challenge it if: {hypothesis['challenge_if']}"
    )


def _check(answer: InvestigationAnswer, labels: set[str]) -> None:
    """Reject an answer that cites evidence it wasn't given or leaves evidence uncited."""
    cited = set(answer.verdict_refs)
    for finding in answer.findings:
        cited.update(finding.evidence_refs)
    unknown = sorted(cited - labels)
    if unknown:
        raise AgentError(
            f"The agent cited evidence it wasn't given ({', '.join(unknown)}). Please re-run."
        )
    if not answer.findings:
        raise AgentError("The agent returned no findings. Please re-run.")
    uncited = [f for f in answer.findings if f.kind in ("supports", "contradicts") and not f.evidence_refs]
    if uncited:
        raise AgentError("The agent reported evidence without saying where it came from. Please re-run.")
    experiment = answer.next_experiment
    if not answer.verdict_reason.strip() or not experiment.experiment.strip() or not experiment.success_metric.strip():
        raise AgentError("Part of the agent's answer was empty. Please re-run.")


def run_investigation(investigation: dict, evidence: list[dict]) -> tuple[InvestigationAnswer, str, float]:
    """Run the investigation. `evidence` must be only the checked (Use) evidence.

    Returns the checked answer, the model that wrote it and how many seconds it took.
    """
    prompt = (
        f"<problem>\n{problem_text(investigation)}\n</problem>\n\n"
        f"<framework>\n{framework_text(investigation['framework_id'])}</framework>\n\n"
        f"<hypothesis>\n{_hypothesis_text(investigation['hypothesis'])}\n</hypothesis>\n\n"
        f"<earlier_diagnosis>\n{diagnosis_text(investigation['recommendation'])}\n</earlier_diagnosis>\n\n"
        f"<evidence_tray>\n{evidence_text(evidence)}\n</evidence_tray>\n\n"
        "Test the hypothesis against the evidence."
    )

    # High effort: this is the step the decision rests on, so it's worth the extra wait.
    started = time.monotonic()
    answer, model = ask_structured(SYSTEM_PROMPT, prompt, InvestigationAnswer, effort="high")
    seconds = round(time.monotonic() - started, 1)

    _check(answer, {item["source_label"] for item in evidence})
    return answer, model, seconds
