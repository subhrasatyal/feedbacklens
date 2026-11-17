import { useState } from 'react'
import type {
  DecisionChoice,
  DecisionInput,
  Finding,
  FindingKind,
  InvestigationDetail,
} from '../../api/investigations'
import { Refs } from './InvestigationStation'
import { VERDICT_NAMES, type StationId } from './stations'

type Props = {
  investigation: InvestigationDetail
  frameworkNames: Record<string, string> // framework id -> display name
  writing: boolean // a brief request is waiting for the agent right now
  onGenerate: () => Promise<void>
  onDecide: (input: DecisionInput) => Promise<void>
  onGoTo: (station: StationId) => void
}

const CONFIDENCE_SEGMENTS = { low: 1, medium: 2, high: 3 }

const CHOICES: { value: DecisionChoice; label: string }[] = [
  { value: 'follow', label: 'Go with the recommendation' },
  { value: 'differ', label: 'Decide differently' },
]

// Station 4: the decision brief. Everything is read from saved, PM-approved state,
// except the recommendation, which the agent writes when the PM clicks Generate brief.
function ResultsStation({ investigation, frameworkNames, writing, onGenerate, onDecide, onGoTo }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const run = investigation.investigation_run
  const experiment = investigation.next_experiment
  const hypothesis = investigation.hypothesis
  const brief = investigation.decision_brief
  if (!run || !experiment || !hypothesis || !investigation.framework_id) return null

  const sameTime = (a: string, b: string) => new Date(a).getTime() === new Date(b).getTime()
  // Out of date if the run or the experiment changed after the brief was written.
  const stale =
    brief !== null &&
    (!sameTime(brief.run_ran_at, run.ran_at) ||
      brief.experiment_version !== experiment.version ||
      !sameTime(brief.experiment_updated_at, experiment.updated_at))

  const of = (...kinds: FindingKind[]) => run.findings.filter((f) => kinds.includes(f.kind))
  const framework = frameworkNames[investigation.framework_id] ?? investigation.framework_id
  const rec = investigation.recommendation
  const agentPicked = rec !== null && rec.framework_id === investigation.framework_id

  // Every label the brief shows, with the evidence it points to.
  const shownLabels = new Set([
    ...run.verdict_refs,
    ...run.findings.flatMap((f) => f.evidence_refs),
    ...(brief?.evidence_refs ?? []),
  ])
  const cited = investigation.evidence.filter((item) => shownLabels.has(item.source_label))

  function generate() {
    setError(null)
    onGenerate().catch((err: Error) => setError(err.message))
  }

  function copyBrief() {
    const text = briefText(investigation, framework)
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => setError("Couldn't copy to the clipboard. Your browser may have blocked it."))
  }

  return (
    <>
      <div className="results-heading">
        <div className="page-heading">
          <span className="eyebrow">Station 4 · Results chamber</span>
          <h1>Decision brief</h1>
          <p className="muted">
            {investigation.question} ·{' '}
            {investigation.mode === 'recommend' ? 'Run B (agent-recommended framework)' : 'Run A (PM-selected framework)'}
          </p>
        </div>
        <button type="button" className="btn" disabled={brief === null} onClick={copyBrief}>
          {copied ? 'Copied' : 'Copy brief'}
        </button>
      </div>

      {brief === null ? (
        <section className="card note-card" aria-labelledby="generate-heading">
          <span className="eyebrow" id="generate-heading">
            Recommendation
          </span>
          {writing ? (
            <p className="agent-message running-line">
              <span className="spinner" aria-hidden="true" />
              Writing the recommendation… usually about 15 seconds.
            </p>
          ) : (
            <p className="agent-message">
              I'll write the recommendation from your approved hypothesis, the investigation's findings
              and the approved experiment. I won't re-read the evidence.
            </p>
          )}
          <div className="row">
            <button type="button" className="btn pri" disabled={writing} onClick={generate}>
              {writing ? 'Writing…' : 'Generate brief'}
            </button>
          </div>
          {error && <p className="form-message error">{error}</p>}
        </section>
      ) : (
        <section className="card verdict-card" aria-labelledby="rec-heading">
          <div className="card-header">
            <span className="eyebrow">Recommendation</span>
            <div className="row">
              <span className="tag">Written by the agent</span>
              <span className="tag">Confidence: {brief.confidence}</span>
            </div>
          </div>
          <div className="row">
            <span className="confidence-bar" role="img" aria-label={`Confidence: ${brief.confidence}`}>
              {[1, 2, 3].map((n) => (
                <span key={n} className={n <= CONFIDENCE_SEGMENTS[brief.confidence] ? 'on' : ''} />
              ))}
            </span>
            <span className="muted">{brief.confidence_reason}</span>
          </div>
          {stale && (
            <p className="form-message error">
              The investigation or next experiment changed since this brief was written. Regenerate to
              update it.
            </p>
          )}
          <h2 className="h" id="rec-heading">
            {brief.recommendation}
          </h2>
          <p>{brief.reasoning}</p>
          <Refs refs={brief.evidence_refs} />
          <p className="muted">
            <strong className="strong">What would change this:</strong> {brief.what_would_change}
          </p>
          <div className="row">
            <button type="button" className={stale ? 'btn pri' : 'btn'} disabled={writing} onClick={generate}>
              {writing ? 'Writing…' : 'Regenerate'}
            </button>
            <span className="muted">Regenerating clears your decision below.</span>
          </div>
          {error && <p className="form-message error">{error}</p>}

          {/* The key resets the form when a new recommendation arrives. */}
          <DecisionForm key={brief.generated_at} investigation={investigation} disabled={writing} onDecide={onDecide} />

          <div className="row">
            <button type="button" className="btn small" onClick={() => onGoTo('planning')}>
              Revise hypothesis (station 2)
            </button>
            <button type="button" className="btn small" onClick={() => onGoTo('investigation')}>
              Re-run investigation (station 3)
            </button>
          </div>
          <p className="muted">The agent recommends. You make the final call.</p>
        </section>
      )}

      <div className="grid-2">
        <section className="card" aria-labelledby="framing-heading">
          <span className="eyebrow" id="framing-heading">
            Problem framing
          </span>
          <p className="strong">{investigation.question}</p>
          <dl className="experiment-fields">
            <dt>Asked by</dt>
            <dd>{investigation.requested_by}</dd>
            <dt>Decide by</dt>
            <dd>{investigation.decision_deadline}</dd>
            {investigation.what_would_change && (
              <>
                <dt>What would change</dt>
                <dd>{investigation.what_would_change}</dd>
              </>
            )}
          </dl>
        </section>
        <section className="card" aria-labelledby="framework-heading">
          <span className="eyebrow" id="framework-heading">
            Framework and rationale
          </span>
          <p className="strong">{framework}</p>
          {agentPicked && rec && <p className="muted">{rec.why_fits}</p>}
          <span className="tag accent fit-tag">
            {agentPicked ? 'Recommended by the agent, accepted by you' : 'Picked by you'}
          </span>
        </section>
      </div>

      <section className="card" aria-labelledby="tested-heading">
        <div className="card-header">
          <span className="eyebrow" id="tested-heading">
            Hypothesis tested
          </span>
          <span className="tag">v{hypothesis.version} · Accepted by you</span>
        </div>
        <p className="hypothesis-quote">{hypothesis.statement}</p>
        <div className="row">
          <span className="verdict-pill small">{VERDICT_NAMES[run.verdict]}</span>
          <span className="tag">Confidence: {run.confidence}</span>
        </div>
        <p className="muted">{run.verdict_reason}</p>
        <Refs refs={run.verdict_refs} />
      </section>

      <section className="evidence-section" aria-labelledby="evidence-heading">
        <h2 className="h" id="evidence-heading">
          Evidence
        </h2>
        <div className="grid-2">
          <BriefGroup title="Supporting evidence" findings={of('supports')} none="None found." />
          <BriefGroup title="Contradicting evidence" findings={of('contradicts')} none="None found." />
          <BriefGroup title="Interpretation" findings={of('interpretation')} none="None." />
          <BriefGroup title="Assumptions and gaps" findings={of('assumption', 'missing')} none="None flagged." />
        </div>
        <section className="card" aria-labelledby="next-heading">
          <div className="card-header">
            <span className="eyebrow" id="next-heading">
              Next experiment
            </span>
            <span className="tag accent">Approved by you · v{experiment.version}</span>
          </div>
          <p className="strong">{experiment.title}</p>
          <dl className="experiment-fields">
            <dt>Experiment</dt>
            <dd>{experiment.experiment}</dd>
            <dt>Success metric</dt>
            <dd>{experiment.success_metric}</dd>
          </dl>
        </section>
      </section>

      <section className="card" aria-labelledby="sources-heading">
        <h2 className="h" id="sources-heading">
          Sources cited
        </h2>
        <ul className="sources-list">
          {cited.map((item) => (
            <li key={item.id}>
              <span className="tag ref">{item.source_label}</span>
              <span>{item.title}</span>
              {item.origin && <span className="tag">{item.origin}</span>}
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

// The PM's final call. Shows the saved decision, with Change to edit it.
function DecisionForm({
  investigation,
  disabled,
  onDecide,
}: {
  investigation: InvestigationDetail
  disabled: boolean
  onDecide: (input: DecisionInput) => Promise<void>
}) {
  const saved = investigation.pm_decision
  const [editing, setEditing] = useState(saved === null)
  const [choice, setChoice] = useState<DecisionChoice | null>(saved?.choice ?? null)
  const [note, setNote] = useState(saved?.note ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const needsNote = choice === 'differ' && note.trim() === ''

  async function save() {
    if (choice === null) return
    setBusy(true)
    setError(null)
    try {
      await onDecide({ choice, note: note.trim() || null })
      setEditing(false)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (saved && !editing) {
    return (
      <div className="decision-box">
        <div className="card-header">
          <span className="h">Your decision</span>
          <span className="tag accent">Decided by you · {new Date(saved.decided_at).toLocaleDateString()}</span>
        </div>
        <p className="strong">{CHOICES.find((c) => c.value === saved.choice)?.label}</p>
        {saved.note && <p>{saved.note}</p>}
        <div className="row">
          <button type="button" className="btn small" disabled={disabled} onClick={() => setEditing(true)}>
            Change
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="decision-box">
      <fieldset className="decision-choices">
        <legend className="h">Your decision</legend>
        {CHOICES.map((option) => (
          <label key={option.value} className={choice === option.value ? 'card mode-option selected' : 'card mode-option'}>
            <input
              type="radio"
              name="decision"
              value={option.value}
              checked={choice === option.value}
              onChange={() => setChoice(option.value)}
            />
            <span className="strong">{option.label}</span>
          </label>
        ))}
      </fieldset>
      <label className="field">
        <span>Note{choice === 'differ' ? '' : ' (optional)'}</span>
        <textarea
          className="input"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What did you decide, and why?"
        />
        {choice === 'differ' && <span className="muted">Say what you decided instead, and why.</span>}
      </label>
      <div className="row">
        <button
          type="button"
          className="btn pri"
          disabled={disabled || busy || choice === null || needsNote}
          onClick={save}
        >
          {busy ? 'Saving…' : 'Save decision'}
        </button>
        {saved && (
          <button type="button" className="btn" disabled={busy} onClick={() => setEditing(false)}>
            Cancel
          </button>
        )}
      </div>
      {error && <p className="form-message error">{error}</p>}
    </div>
  )
}

function BriefGroup({ title, findings, none }: { title: string; findings: Finding[]; none: string }) {
  return (
    <section className="card">
      <span className="eyebrow">{title}</span>
      {findings.length === 0 ? (
        <p className="muted">{none}</p>
      ) : (
        findings.map((finding, index) => (
          <div key={index} className={`finding ${finding.kind}`}>
            <p>{finding.statement}</p>
            {finding.evidence_refs.length > 0 ? (
              <Refs refs={finding.evidence_refs} />
            ) : (
              <span className="tag dashed">{finding.kind === 'missing' ? 'Not in tray' : 'Unverified'}</span>
            )}
          </div>
        ))
      )}
    </section>
  )
}

// The brief as plain text, for pasting into an email or doc.
function briefText(investigation: InvestigationDetail, framework: string): string {
  const run = investigation.investigation_run!
  const brief = investigation.decision_brief!
  const experiment = investigation.next_experiment!
  const refs = (labels: string[]) => (labels.length ? ` [${labels.join(', ')}]` : '')
  const list = (kinds: FindingKind[]) =>
    run.findings
      .filter((f) => kinds.includes(f.kind))
      .map((f) => `- ${f.statement}${refs(f.evidence_refs)}`)
      .join('\n') || '- None'
  const decision = investigation.pm_decision
  const lines = [
    `DECISION BRIEF: ${investigation.question}`,
    `Asked by ${investigation.requested_by} · decide by ${investigation.decision_deadline}`,
    '',
    `RECOMMENDATION (confidence: ${brief.confidence})`,
    brief.recommendation,
    `${brief.reasoning}${refs(brief.evidence_refs)}`,
    `Confidence: ${brief.confidence_reason}`,
    `What would change this: ${brief.what_would_change}`,
    '',
    `PM DECISION: ${decision ? (decision.choice === 'follow' ? 'Go with the recommendation' : 'Decide differently') + (decision.note ? `. ${decision.note}` : '') : 'Not recorded yet'}`,
    '',
    `FRAMEWORK: ${framework}`,
    `HYPOTHESIS (v${investigation.hypothesis!.version}): ${investigation.hypothesis!.statement}`,
    `VERDICT: ${VERDICT_NAMES[run.verdict]} (confidence: ${run.confidence}). ${run.verdict_reason}`,
    '',
    'SUPPORTING EVIDENCE',
    list(['supports']),
    '',
    'CONTRADICTING EVIDENCE',
    list(['contradicts']),
    '',
    'INTERPRETATION',
    list(['interpretation']),
    '',
    'ASSUMPTIONS AND GAPS',
    list(['assumption', 'missing']),
    '',
    `NEXT EXPERIMENT (approved, v${experiment.version}): ${experiment.title}`,
    experiment.experiment,
    `Success metric: ${experiment.success_metric}`,
    '',
    'SOURCES READ',
    ...investigation.evidence
      .filter((item) => run.sources_read.includes(item.source_label))
      .map((item) => `${item.source_label}: ${item.title}${item.origin ? ` (${item.origin})` : ''}`),
  ]
  return lines.join('\n')
}

export default ResultsStation
