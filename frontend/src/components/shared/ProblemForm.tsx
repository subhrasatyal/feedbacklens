import { useState, type FormEvent } from 'react'
import type { Investigation, InvestigationInput } from '../../api/investigations'

type Props = {
  // The investigation being edited, or null when starting a new one.
  investigation: Investigation | null
  onSave: (input: InvestigationInput) => Promise<void>
}

// Clipboard section 1: the problem or decision to investigate.
function ProblemForm({ investigation, onSave }: Props) {
  // What's currently typed into each field. Starts from the saved values, if any.
  const [form, setForm] = useState({
    question: investigation?.question ?? '',
    requested_by: investigation?.requested_by ?? '',
    decision_deadline: investigation?.decision_deadline ?? '',
    what_would_change: investigation?.what_would_change ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const isNew = investigation === null

  function updateField(name: keyof typeof form, value: string) {
    setForm({ ...form, [name]: value })
    setMessage(null) // an old "Saved" no longer applies once you edit
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault() // stop the browser reloading the page
    setSaving(true)
    setMessage(null)
    try {
      await onSave({
        question: form.question.trim(),
        requested_by: form.requested_by.trim(),
        decision_deadline: form.decision_deadline,
        what_would_change: form.what_would_change.trim() || null,
      })
      setMessage({ kind: 'success', text: isNew ? 'Investigation started.' : 'Changes saved.' })
    } catch (error) {
      setMessage({ kind: 'error', text: (error as Error).message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit} aria-labelledby="problem-heading">
      <h2 className="h" id="problem-heading">
        Problem or decision
      </h2>

      <label className="field">
        Question to investigate
        <textarea
          className="input"
          required
          rows={3}
          placeholder="e.g. Several customers have requested an AI assistant. Should we build one?"
          value={form.question}
          onChange={(e) => updateField('question', e.target.value)}
        />
      </label>

      <div className="grid-2">
        <label className="field">
          Who is asking / stakeholders
          <input
            className="input"
            required
            placeholder="e.g. Customers via sales + leadership"
            value={form.requested_by}
            onChange={(e) => updateField('requested_by', e.target.value)}
          />
        </label>

        <label className="field">
          Decision deadline
          <input
            className="input"
            required
            type="date"
            value={form.decision_deadline}
            onChange={(e) => updateField('decision_deadline', e.target.value)}
          />
        </label>
      </div>

      <label className="field">
        What would change if you knew the answer? (optional)
        <textarea
          className="input"
          rows={2}
          placeholder="e.g. Whether to commit engineering next quarter"
          value={form.what_would_change}
          onChange={(e) => updateField('what_would_change', e.target.value)}
        />
      </label>

      <div className="row">
        <button type="submit" className={isNew ? 'btn pri' : 'btn'} disabled={saving}>
          {saving ? 'Saving…' : isNew ? 'Start investigation' : 'Save changes'}
        </button>
        {message && <p className={`form-message ${message.kind}`}>{message.text}</p>}
      </div>
    </form>
  )
}

export default ProblemForm
