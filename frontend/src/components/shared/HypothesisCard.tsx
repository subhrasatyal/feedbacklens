import { useState, type FormEvent } from 'react'
import type { HypothesisEdit, InvestigationDetail } from '../../api/investigations'

type Props = {
  investigation: InvestigationDetail
  frameworkNames: Record<string, string> // framework id -> display name
  drafting: boolean // a draft request is running right now
  onDraft: () => Promise<void>
  onSave: (input: HypothesisEdit) => Promise<void>
  onAccept: () => Promise<void>
  onReject: (reason: string) => Promise<void>
}

// The last part of the Planning station: turn the question into one testable hypothesis.
// The agent drafts it; the PM edits, accepts, or rejects it with a reason (and the agent redrafts).
function HypothesisCard({
  investigation,
  frameworkNames,
  drafting,
  onDraft,
  onSave,
  onAccept,
  onReject,
}: Props) {
  const hypothesis = investigation.hypothesis
  const [statement, setStatement] = useState(hypothesis?.statement ?? '')
  const [challengeIf, setChallengeIf] = useState(hypothesis?.challenge_if ?? '')
  // "Write my own" when there is no hypothesis yet, or "Edit" on an accepted one.
  const [editing, setEditing] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // When a new or saved hypothesis arrives from the backend, show its text in the boxes.
  // (React's pattern for resetting state when a prop changes, without an effect.)
  const savedKey = hypothesis ? `${hypothesis.version}-${hypothesis.updated_at}` : 'none'
  const [shownKey, setShownKey] = useState(savedKey)
  if (savedKey !== shownKey) {
    setShownKey(savedKey)
    setStatement(hypothesis?.statement ?? '')
    setChallengeIf(hypothesis?.challenge_if ?? '')
  }

  const nameOf = (id: string | null) => (id ? (frameworkNames[id] ?? id) : 'no framework')
  const checked = investigation.evidence.filter((item) => item.use_by_agent).length
  const sources = checked === 1 ? '1 checked source' : `${checked} checked sources`
  const working = busy || drafting
  const showForm = (hypothesis !== null && hypothesis.status === 'draft') || editing
  const changed =
    hypothesis === null ||
    statement.trim() !== hypothesis.statement ||
    challengeIf.trim() !== hypothesis.challenge_if
  const complete = statement.trim() !== '' && challengeIf.trim() !== ''

  // Run one action, showing its error on the card if it fails.
  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  function draft() {
    run(onDraft)
  }

  function save(event: FormEvent) {
    event.preventDefault()
    run(async () => {
      await onSave({ statement, challenge_if: challengeIf })
      setEditing(false)
    })
  }

  // Unsaved edits are saved first, so what gets accepted is what's on screen.
  function accept() {
    run(async () => {
      if (changed) await onSave({ statement, challenge_if: challengeIf })
      await onAccept()
      setEditing(false)
    })
  }

  // Leave "Write my own" or "Edit" without saving: put the saved text back.
  function cancelEdit() {
    setEditing(false)
    setStatement(hypothesis?.statement ?? '')
    setChallengeIf(hypothesis?.challenge_if ?? '')
  }

  // Reject with the PM's reason, then ask the agent for a new draft that takes it into account.
  function rejectAndRedraft() {
    run(async () => {
      await onReject(reason)
      setRejecting(false)
      setReason('')
      await onDraft()
    })
  }

  return (
    <section className="card" aria-labelledby="hypothesis-heading">
      <div className="card-header">
        <div className="page-heading">
          <span className="eyebrow">Hypothesis</span>
          <h2 className="h" id="hypothesis-heading">
            What do we believe, and how would we know?
          </h2>
        </div>
        {hypothesis && (
          <div className="row">
            <span className="tag">v{hypothesis.version}</span>
            {hypothesis.status === 'accepted' ? (
              <span className="tag accent">Accepted by you</span>
            ) : (
              <span className="tag dashed">Untested proposition</span>
            )}
            <span className="tag">
              {hypothesis.written_by === 'agent' ? 'Drafted by the agent' : 'Written or edited by you'}
            </span>
          </div>
        )}
      </div>

      {hypothesis === null && !editing && (
        <>
          <p className="agent-message">
            {drafting
              ? `Drafting… reading ${sources} with ${nameOf(investigation.framework_id)}.`
              : `I'll turn the question into one testable hypothesis, using ${nameOf(investigation.framework_id)} and the ${sources}. It's a proposition to investigate, not a finding.`}
          </p>
          <div className="row">
            <button type="button" className="btn pri" disabled={working} onClick={draft}>
              {drafting ? 'Drafting…' : 'Draft hypothesis'}
            </button>
            <button type="button" className="btn" disabled={working} onClick={() => setEditing(true)}>
              Write my own
            </button>
          </div>
        </>
      )}

      {hypothesis && hypothesis.framework_id !== investigation.framework_id && (
        <p className="form-message error">
          This hypothesis was made with {nameOf(hypothesis.framework_id)}, but the saved approach is
          now {nameOf(investigation.framework_id)}. Edit it, or reject it to get a new draft.
        </p>
      )}

      {showForm && (
        <form className="stack-form" onSubmit={save}>
          <label className="field">
            <span>Hypothesis</span>
            <textarea
              className="input"
              rows={3}
              required
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Would challenge it if…</span>
            <textarea
              className="input"
              rows={2}
              required
              value={challengeIf}
              onChange={(e) => setChallengeIf(e.target.value)}
            />
            <span className="muted">The evidence that would show it's wrong.</span>
          </label>
          {hypothesis && <Basis basedOn={hypothesis.based_on} rationale={hypothesis.rationale} />}

          {!rejecting && (
            <div className="row">
              <button type="button" className="btn pri" disabled={working || !complete} onClick={accept}>
                {changed && hypothesis ? 'Save and accept' : 'Accept'}
              </button>
              <button type="submit" className="btn" disabled={working || !changed || !complete}>
                Save edits
              </button>
              {hypothesis && (
                <button type="button" className="btn" disabled={working} onClick={() => setRejecting(true)}>
                  Reject and redraft
                </button>
              )}
              {editing && (
                <button type="button" className="btn" disabled={working} onClick={cancelEdit}>
                  Cancel
                </button>
              )}
            </div>
          )}
        </form>
      )}

      {hypothesis && hypothesis.status === 'accepted' && !editing && (
        <>
          <p className="strong">{hypothesis.statement}</p>
          <p className="muted">
            <strong className="strong">Would challenge it if:</strong> {hypothesis.challenge_if}
          </p>
          <Basis basedOn={hypothesis.based_on} rationale={hypothesis.rationale} />
          <p className="muted">
            Still a proposition: the investigation station will test it against the evidence.
          </p>
          <div className="row">
            <button type="button" className="btn" disabled={working} onClick={() => setEditing(true)}>
              Edit
            </button>
            <button type="button" className="btn" disabled={working} onClick={() => setRejecting(true)}>
              Reject and redraft
            </button>
          </div>
        </>
      )}

      {rejecting && (
        <div className="stack-form">
          <label className="field">
            <span>Why are you rejecting it?</span>
            <input
              className="input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Restates the solution, not the customer's need"
            />
            <span className="muted">The agent reads your reason before drafting the next one.</span>
          </label>
          <div className="row">
            <button
              type="button"
              className="btn pri"
              disabled={working || reason.trim() === ''}
              onClick={rejectAndRedraft}
            >
              {drafting ? 'Drafting a new one…' : 'Reject and redraft'}
            </button>
            <button type="button" className="btn" disabled={working} onClick={() => setRejecting(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="form-message error">{error}</p>}

      {investigation.rejected_hypotheses.length > 0 && (
        <details className="paste-details">
          <summary>Previously rejected ({investigation.rejected_hypotheses.length})</summary>
          <ul className="rec-list">
            {[...investigation.rejected_hypotheses].reverse().map((old) => (
              <li key={old.version}>
                <s className="muted">
                  v{old.version} · {old.statement}
                </s>
                <br />
                <span className="muted">Rejected by you: {old.reason}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}

// What a draft rests on: cited evidence labels and the agent's reason. Not test results.
function Basis({ basedOn, rationale }: { basedOn: string[]; rationale: string | null }) {
  if (basedOn.length === 0 && !rationale) return null
  return (
    <p className="muted">
      {basedOn.length > 0 && (
        <>
          Based on:{' '}
          {basedOn.map((ref) => (
            <span key={ref} className="tag ref">
              {ref}
            </span>
          ))}{' '}
        </>
      )}
      {rationale && <>· {rationale}</>}
    </p>
  )
}

export default HypothesisCard
