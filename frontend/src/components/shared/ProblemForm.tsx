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
    <form className="stack-form" onSubmit={handleSubmit}>
      <label>
        Question to investigate
        <textarea
          required
          rows={3}
          placeholder="e.g. Several customers have requested an AI assistant. Should we build one?"
          value={form.question}
          onChange={(e) => updateField('question', e.target.value)}
        />
      </label>

      <label>
        Who is asking?
        <input
          required
          placeholder="e.g. CEO, three enterprise customers"
          value={form.requested_by}
          onChange={(e) => updateField('requested_by', e.target.value)}
        />
      </label>

      <label>
        Decision deadline
        <input
          required
          type="date"
          value={form.decision_deadline}
          onChange={(e) => updateField('decision_deadline', e.target.value)}
        />
      </label>

      <label>
        What would change if you knew the answer? (optional)
        <textarea
          rows={2}
          placeholder="e.g. Whether we commit two engineers next quarter"
          value={form.what_would_change}
          onChange={(e) => updateField('what_would_change', e.target.value)}
        />
      </label>

      <button type="submit" disabled={saving}>
        {saving ? 'Saving…' : isNew ? 'Start investigation' : 'Save changes'}
      </button>

      {message && <p className={`form-message ${message.kind}`}>{message.text}</p>}
    </form>
  )
}

export default ProblemForm
