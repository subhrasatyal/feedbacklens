import { useState, type FormEvent } from 'react'
import type { ExperimentEdit, InvestigationDetail, NextExperiment } from '../../api/investigations'

type Props = {
  investigation: InvestigationDetail
  redrafting: boolean // a redraft request is waiting for the agent right now
  disabled: boolean // e.g. while the investigation is re-running
  onDraft: () => Promise<void>
  onSave: (input: ExperimentEdit) => Promise<void>
  onApprove: () => Promise<void>
  onReject: (reason: string) => Promise<void>
  onContinue: () => void // go to the Results chamber
}

const EMPTY: ExperimentEdit = { title: '', experiment: '', why: '', success_metric: '' }

const FIELDS: { key: keyof ExperimentEdit; label: string; rows: number }[] = [
  { key: 'title', label: 'Title', rows: 1 },
  { key: 'experiment', label: 'Experiment', rows: 3 },
  { key: 'why', label: 'Why', rows: 2 },
  { key: 'success_metric', label: 'Success metric', rows: 2 },
]

function editableParts(experiment: NextExperiment | null): ExperimentEdit {
  if (!experiment) return EMPTY
  const { title, experiment: what, why, success_metric } = experiment
  return { title, experiment: what, why, success_metric }
}

// The end of the Investigation station: the agent proposes one next experiment from its findings.
// The PM approves it, edits it, or rejects it with a reason (and the agent redrafts).
function ExperimentCard({
  investigation,
  redrafting,
  disabled,
  onDraft,
  onSave,
  onApprove,
  onReject,
  onContinue,
}: Props) {
  const current = investigation.next_experiment
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<ExperimentEdit>(EMPTY)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const working = busy || redrafting || disabled
  const saved = editableParts(current)
  const changed = (Object.keys(form) as (keyof ExperimentEdit)[]).some((k) => form[k].trim() !== saved[k])
  const complete = Object.values(form).every((value) => value.trim() !== '')

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

  // Open the form with the saved text (or empty, when writing your own).
  function startEdit() {
    setForm(editableParts(current))
    setEditing(true)
    setRejecting(false)
  }

  function save(event: FormEvent) {
    event.preventDefault()
    run(async () => {
      await onSave(form)
      setEditing(false)
    })
  }

  // Unsaved edits are saved first, so what gets approved is what's on screen.
  function saveAndApprove() {
    run(async () => {
      if (changed) await onSave(form)
      await onApprove()
      setEditing(false)
    })
  }

  // Reject with the PM's reason, then ask the agent for a new proposal that takes it into account.
  function rejectAndRedraft() {
    run(async () => {
      await onReject(reason)
      setRejecting(false)
      setReason('')
      await onDraft()
    })
  }

  return (
    <section className="card" aria-labelledby="experiment-heading">
      <div className="card-header">
        <div className="page-heading">
          <span className="eyebrow">Recommend next step</span>
          <h2 className="h" id="experiment-heading">
            Next experiment
          </h2>
        </div>
        {current && (
          <div className="row">
            <span className="tag">v{current.version}</span>
            {current.status === 'approved' ? (
              <span className="tag accent">Approved by you</span>
            ) : (
              <span className="tag dashed">Proposal</span>
            )}
            <span className="tag">
              {current.written_by === 'agent' ? 'Proposed by the agent' : 'Written or edited by you'}
            </span>
          </div>
        )}
      </div>

      {current === null && !editing && (
        <>
          <p className="agent-message">
            {redrafting
              ? 'Drafting a new experiment from my findings and your reasons…'
              : 'No experiment yet. I can draft a new one that takes your reasons into account, or you can write your own.'}
          </p>
          <div className="row">
            <button type="button" className="btn pri" disabled={working} onClick={() => run(onDraft)}>
              {redrafting ? 'Drafting…' : 'Draft a new one'}
            </button>
            <button type="button" className="btn" disabled={working} onClick={startEdit}>
              Write my own
            </button>
          </div>
        </>
      )}

      {current && !editing && (
        <>
          <dl className="experiment-fields">
            <dt>Title</dt>
            <dd className="strong">{current.title}</dd>
            <dt>Experiment</dt>
            <dd>{current.experiment}</dd>
            <dt>Why</dt>
            <dd>{current.why}</dd>
            <dt>Success metric</dt>
            <dd>{current.success_metric}</dd>
          </dl>
          {!rejecting && (
            <div className="row">
              {current.status === 'proposed' && (
                <button type="button" className="btn pri" disabled={working} onClick={() => run(onApprove)}>
                  Approve
                </button>
              )}
              <button type="button" className="btn" disabled={working} onClick={startEdit}>
                Edit
              </button>
              <button type="button" className="btn" disabled={working} onClick={() => setRejecting(true)}>
                Reject and redraft
              </button>
            </div>
          )}
          {current.status === 'approved' && (
            <div className="row">
              <button type="button" className="btn pri" disabled={working} onClick={onContinue}>
                Next: decision brief
              </button>
            </div>
          )}
        </>
      )}

      {editing && (
        <form className="stack-form" onSubmit={save}>
          {FIELDS.map((field) => (
            <label key={field.key} className="field">
              <span>{field.label}</span>
              <textarea
                className="input"
                rows={field.rows}
                required
                value={form[field.key]}
                onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
              />
            </label>
          ))}
          <div className="row">
            <button type="button" className="btn pri" disabled={working || !complete} onClick={saveAndApprove}>
              {changed ? 'Save and approve' : 'Approve'}
            </button>
            <button type="submit" className="btn" disabled={working || !changed || !complete}>
              Save edits
            </button>
            <button type="button" className="btn" disabled={working} onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {rejecting && (
        <div className="stack-form">
          <label className="field">
            <span>Why are you rejecting it?</span>
            <input
              className="input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. We can't reach those accounts this month; use data we already have"
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
              {redrafting ? 'Drafting a new one…' : 'Reject and redraft'}
            </button>
            <button type="button" className="btn" disabled={working} onClick={() => setRejecting(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="form-message error">{error}</p>}

      {investigation.rejected_experiments.length > 0 && (
        <details className="paste-details">
          <summary>Previously rejected ({investigation.rejected_experiments.length})</summary>
          <ul className="rec-list">
            {[...investigation.rejected_experiments].reverse().map((old) => (
              <li key={old.version}>
                <s className="muted">
                  v{old.version} · {old.title}: {old.experiment}
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

export default ExperimentCard
