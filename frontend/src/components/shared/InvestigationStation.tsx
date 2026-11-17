import { useState } from 'react'
import type {
  ExperimentEdit,
  Finding,
  FindingKind,
  InvestigationDetail,
} from '../../api/investigations'
import ExperimentCard from './ExperimentCard'
import { VERDICT_NAMES } from './stations'

type Props = {
  investigation: InvestigationDetail
  frameworkNames: Record<string, string> // framework id -> display name
  running: boolean // a run request is waiting for the agent right now
  redrafting: boolean // a next-experiment redraft is waiting right now
  onRun: () => Promise<void>
  onDraftExperiment: () => Promise<void>
  onSaveExperiment: (input: ExperimentEdit) => Promise<void>
  onApproveExperiment: () => Promise<void>
  onRejectExperiment: (reason: string) => Promise<void>
}

// The five kinds of finding, in the order they're shown. Evidence (supports, contradicts)
// has a solid border, the agent's interpretation dotted, assumptions and gaps dashed.
const FINDING_GROUPS: { kind: FindingKind; title: string; none: string }[] = [
  { kind: 'supports', title: 'Supports', none: 'No supporting evidence found.' },
  { kind: 'contradicts', title: 'Contradicts', none: 'No contradicting evidence found.' },
  { kind: 'interpretation', title: 'Interpretation', none: 'None.' },
  { kind: 'assumption', title: 'Assumption', none: 'None.' },
  { kind: 'missing', title: 'Missing', none: 'Nothing flagged as missing.' },
]

// Station 3: test the accepted hypothesis against the checked evidence in one approved run.
function InvestigationStation({
  investigation,
  frameworkNames,
  running,
  redrafting,
  onRun,
  onDraftExperiment,
  onSaveExperiment,
  onApproveExperiment,
  onRejectExperiment,
}: Props) {
  const [error, setError] = useState<string | null>(null)
  const hypothesis = investigation.hypothesis
  const run = investigation.investigation_run
  const framework = investigation.framework_id
    ? (frameworkNames[investigation.framework_id] ?? investigation.framework_id)
    : 'the saved framework'
  const checked = investigation.evidence.filter((item) => item.use_by_agent).map((item) => item.source_label)
  const sources = checked.length === 1 ? '1 checked source' : `${checked.length} checked sources`

  // The run is out of date if the hypothesis, framework or checked sources changed since it ran.
  const stale =
    run !== null &&
    (run.hypothesis_version !== hypothesis?.version ||
      run.framework_id !== investigation.framework_id ||
      [...run.sources_read].sort().join() !== [...checked].sort().join())

  function startRun() {
    setError(null)
    onRun().catch((err: Error) => setError(err.message))
  }

  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">Station 3 · Investigation</span>
        <h1>Testing the hypothesis</h1>
        <p className="muted">One run against your checked sources. Nothing runs until you click.</p>
      </div>

      {hypothesis && (
        <section className="card" aria-labelledby="under-test-heading">
          <div className="card-header">
            <h2 className="h" id="under-test-heading">
              Hypothesis under test
            </h2>
            <div className="row">
              <span className="tag">v{hypothesis.version}</span>
              <span className="tag accent">Accepted by you</span>
              <span className="tag">{framework}</span>
            </div>
          </div>
          <p className="hypothesis-quote">{hypothesis.statement}</p>
          <p className="muted">
            <strong className="strong">Would challenge it if:</strong> {hypothesis.challenge_if}
          </p>
        </section>
      )}

      <section className="card" aria-labelledby="run-heading">
        <div className="card-header">
          <h2 className="h" id="run-heading">
            Run
          </h2>
          {running && <span className="tag accent">Running</span>}
          {!running && run && <span className="tag">Done</span>}
        </div>

        {running ? (
          <p className="agent-message running-line">
            <span className="spinner" aria-hidden="true" />
            Reading {sources} and applying the {framework} procedure… usually about 30 seconds.
          </p>
        ) : run === null ? (
          <p className="agent-message">
            I'll read {sources} ({checked.join(', ')}) and apply the {framework} procedure to test
            this hypothesis. Then I'll propose a next experiment for you to approve.
          </p>
        ) : (
          <ul className="activity-log" aria-label="What ran">
            <li>
              Read {run.sources_read.length} checked source{run.sources_read.length === 1 ? '' : 's'}:{' '}
              {run.sources_read.join(', ')}
            </li>
            <li>
              Applied the {frameworkNames[run.framework_id] ?? run.framework_id} procedure to hypothesis v
              {run.hypothesis_version}
            </li>
            <li className="muted">
              {run.duration_seconds} s · {run.model} · {new Date(run.ran_at).toLocaleString()}
            </li>
          </ul>
        )}

        {stale && !running && (
          <p className="form-message error">
            The hypothesis, framework or checked sources changed since this run. Re-run to test
            what's saved now.
          </p>
        )}

        <div className="row">
          <button
            type="button"
            className={run === null || stale ? 'btn pri' : 'btn'}
            disabled={running || redrafting || checked.length === 0}
            onClick={startRun}
          >
            {running ? 'Running…' : run === null ? 'Run investigation' : 'Re-run'}
          </button>
          {run && !running && (
            <span className="muted">Re-running replaces these findings and the next experiment.</span>
          )}
        </div>
        {error && <p className="form-message error">{error}</p>}
      </section>

      {run && (
        <>
          <section className="card verdict-card" aria-labelledby="verdict-heading">
            <span className="eyebrow" id="verdict-heading">
              Verdict
            </span>
            <div className="row">
              <span className="verdict-pill">{VERDICT_NAMES[run.verdict]}</span>
              <span className="tag">Confidence: {run.confidence}</span>
            </div>
            <p>{run.verdict_reason}</p>
            <Refs refs={run.verdict_refs} />
          </section>

          <section className="card" aria-labelledby="findings-heading">
            <div className="card-header">
              <h2 className="h" id="findings-heading">
                Findings
              </h2>
              <div className="row finding-legend">
                <span>
                  <span className="legend-box supports" aria-hidden="true" /> Evidence
                </span>
                <span>
                  <span className="legend-box interpretation" aria-hidden="true" /> Agent interpretation
                </span>
                <span>
                  <span className="legend-box assumption" aria-hidden="true" /> Assumption or gap
                </span>
              </div>
            </div>
            {FINDING_GROUPS.map((group) => (
              <FindingGroup
                key={group.kind}
                title={group.title}
                none={group.none}
                findings={run.findings.filter((f) => f.kind === group.kind)}
              />
            ))}
          </section>

          <ExperimentCard
            investigation={investigation}
            redrafting={redrafting}
            disabled={running}
            onDraft={onDraftExperiment}
            onSave={onSaveExperiment}
            onApprove={onApproveExperiment}
            onReject={onRejectExperiment}
          />
        </>
      )}
    </>
  )
}

function FindingGroup({ title, none, findings }: { title: string; none: string; findings: Finding[] }) {
  return (
    <div className="finding-group">
      <div className="card-header">
        <h3 className="finding-title">{title}</h3>
        <span className="tag">{findings.length}</span>
      </div>
      {findings.length === 0 ? (
        <p className="muted">{none}</p>
      ) : (
        findings.map((finding, index) => (
          <div key={index} className={`finding ${finding.kind}`}>
            <p>{finding.statement}</p>
            {finding.evidence_refs.length > 0 ? (
              <Refs refs={finding.evidence_refs} />
            ) : (
              <span className="tag dashed">
                {finding.kind === 'missing' ? 'Not in tray' : 'Unverified'}
              </span>
            )}
          </div>
        ))
      )}
    </div>
  )
}

function Refs({ refs }: { refs: string[] }) {
  if (refs.length === 0) return null
  return (
    <div className="row ref-row">
      {refs.map((ref) => (
        <span key={ref} className="tag ref">
          {ref}
        </span>
      ))}
    </div>
  )
}

export default InvestigationStation
