import { useState } from 'react'
import type { Framework } from '../../api/frameworks'
import type { EvidencePoint, Recommendation } from '../../api/investigations'

type Props = {
  recommendation: Recommendation
  frameworks: Framework[]
  checkedLabels: string[] // the sources ticked Use right now
  selectedId: string | null
  recommending: boolean
  onChoose: (frameworkId: string) => void
  onRerun: () => void
}

const CONFIDENCE = { low: 'Low', medium: 'Medium', high: 'High' }

// A list of evidence statements, each followed by the labels it cites.
function EvidenceList({ points, empty }: { points: EvidencePoint[]; empty: string }) {
  if (points.length === 0) return <p className="muted">{empty}</p>
  return (
    <ul className="rec-list">
      {points.map((point) => (
        <li key={point.statement}>
          {point.statement}{' '}
          {point.evidence_refs.map((ref) => (
            <span key={ref} className="tag ref">
              {ref}
            </span>
          ))}
        </li>
      ))}
    </ul>
  )
}

// The agent's recommendation, as in the wireframe's Planning board, plus the
// evidence, contradictions and assumptions it was based on.
function RecommendationCard({
  recommendation: rec,
  frameworks,
  checkedLabels,
  selectedId,
  recommending,
  onChoose,
  onRerun,
}: Props) {
  const [showWhyNot, setShowWhyNot] = useState(false)
  const nameOf = (id: string) => frameworks.find((f) => f.id === id)?.name ?? id

  // Has the PM ticked or unticked sources since the agent read them?
  const sourcesChanged = [...checkedLabels].sort().join() !== [...rec.sources_read].sort().join()

  return (
    <section className="card rec-card" aria-labelledby="rec-heading">
      <div className="card-header">
        <div className="page-heading">
          <span className="eyebrow">Agent recommendation</span>
          <h2 className="h rec-name" id="rec-heading">
            {nameOf(rec.framework_id)}
          </h2>
        </div>
        <div className="row">
          <span className="tag" title={rec.confidence_reason}>
            Fit confidence: {CONFIDENCE[rec.confidence]}
          </span>
          <span className="tag">Runner-up: {nameOf(rec.runner_up_id)}</span>
        </div>
      </div>

      {sourcesChanged && (
        <p className="form-message error">
          The checked sources have changed since this recommendation (it read{' '}
          {rec.sources_read.join(', ')}). Re-run to include the current ones.
        </p>
      )}

      <div className="rec-grid">
        <div className="rec-part">
          <span className="rec-label">Diagnosis</span>
          <p className="muted">{rec.diagnosis}</p>
        </div>
        <div className="rec-part">
          <span className="rec-label">Why this fits</span>
          <p className="muted">{rec.why_fits}</p>
        </div>
        <div className="rec-part">
          <span className="rec-label">What it will uncover</span>
          <ul className="rec-list muted">
            {rec.will_uncover.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <p className="muted">
        <strong className="strong">Confidence is {rec.confidence}:</strong> {rec.confidence_reason}
      </p>

      {rec.context_gaps.length > 0 && (
        <div className="gap-box">
          <strong>Context gaps</strong>
          <ul className="rec-list">
            {rec.context_gaps.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Kept apart, as the PRD asks: what the evidence shows, what cuts against it, and what is assumed. */}
      <details className="paste-details">
        <summary>Evidence, contradictions and assumptions</summary>
        <div className="grid-2 rec-details">
          <div className="rec-part">
            <span className="rec-label">Evidence found</span>
            <EvidenceList points={rec.evidence_found} empty="None cited." />
          </div>
          <div className="rec-part">
            <span className="rec-label">Contradicting evidence</span>
            <EvidenceList points={rec.contradictions} empty="None found in the checked sources." />
          </div>
          <div className="rec-part">
            <span className="rec-label">Assumptions (not backed by evidence)</span>
            {rec.assumptions.length === 0 ? (
              <p className="muted">None stated.</p>
            ) : (
              <ul className="rec-list">
                {rec.assumptions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </details>

      <div className="row">
        <button
          type="button"
          className="btn pri"
          disabled={selectedId === rec.framework_id}
          onClick={() => onChoose(rec.framework_id)}
        >
          {selectedId === rec.framework_id ? 'Accepted' : 'Accept'}
        </button>
        <button
          type="button"
          className="btn"
          disabled={selectedId === rec.runner_up_id}
          onClick={() => onChoose(rec.runner_up_id)}
        >
          Use runner-up instead
        </button>
        <button
          type="button"
          className="btn"
          aria-expanded={showWhyNot}
          onClick={() => setShowWhyNot(!showWhyNot)}
        >
          {showWhyNot ? 'Hide why not another' : 'Ask why not another'}
        </button>
        <button type="button" className="btn" disabled={recommending} onClick={onRerun}>
          {recommending ? `Re-running… reading ${checkedLabels.length} sources` : 'Re-run'}
        </button>
      </div>

      {/* These reasons came with the recommendation; showing them makes no new agent call. */}
      {showWhyNot && (
        <ul className="rec-list">
          {rec.why_not.map((item) => (
            <li key={item.framework_id}>
              <strong className="strong">{nameOf(item.framework_id)}:</strong> {item.reason}
            </li>
          ))}
        </ul>
      )}

      <p className="muted">
        Recommended by {rec.model} from {rec.sources_read.length} checked source
        {rec.sources_read.length === 1 ? '' : 's'} on {new Date(rec.created_at).toLocaleString()}.
      </p>
    </section>
  )
}

export default RecommendationCard
