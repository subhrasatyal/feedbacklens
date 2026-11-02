import { useState, type FormEvent } from 'react'
import { createFeedback, type SourceType } from '../../api/feedback'

// The choices for the "Source type" dropdown: value sent to the API, and label shown.
const SOURCE_TYPES: { value: SourceType; label: string }[] = [
  { value: 'interview', label: 'Interview' },
  { value: 'support_ticket', label: 'Support ticket' },
  { value: 'metric', label: 'Metric' },
  { value: 'document', label: 'Document' },
]

const EMPTY_FORM = {
  source_type: 'interview' as SourceType,
  source_label: '',
  title: '',
  content: '',
  customer_name: '',
  customer_segment: '',
  occurred_at: '',
}

function FeedbackForm() {
  // What's currently typed into each field.
  const [form, setForm] = useState(EMPTY_FORM)
  // True while waiting for the backend, so the button can't be double-clicked.
  const [submitting, setSubmitting] = useState(false)
  // A message shown under the form after submitting: success or the error.
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  // Update one field, keeping the others as they were.
  function updateField(name: keyof typeof EMPTY_FORM, value: string) {
    setForm({ ...form, [name]: value })
  }

  async function handleSubmit(event: FormEvent) {
    // Stop the browser's default behaviour of reloading the page on submit.
    event.preventDefault()
    setSubmitting(true)
    setMessage(null)

    try {
      const saved = await createFeedback({
        source_type: form.source_type,
        source_label: form.source_label.trim(),
        title: form.title.trim(),
        content: form.content.trim(),
        // Optional fields: send nothing (undefined) when left blank.
        customer_name: form.customer_name.trim() || undefined,
        customer_segment: form.customer_segment.trim() || undefined,
        occurred_at: form.occurred_at || undefined,
      })
      setMessage({ kind: 'success', text: `Saved "${saved.title}" as ${saved.source_label}.` })
      setForm(EMPTY_FORM)
    } catch (error) {
      setMessage({ kind: 'error', text: (error as Error).message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="feedback-form" onSubmit={handleSubmit}>
      <h2>Add feedback</h2>

      <label>
        Source type
        <select
          value={form.source_type}
          onChange={(e) => updateField('source_type', e.target.value)}
        >
          {SOURCE_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        Label (short ID used in citations, e.g. INT-01)
        <input
          required
          value={form.source_label}
          onChange={(e) => updateField('source_label', e.target.value)}
        />
      </label>

      <label>
        Title
        <input required value={form.title} onChange={(e) => updateField('title', e.target.value)} />
      </label>

      <label>
        Content
        <textarea
          required
          rows={6}
          value={form.content}
          onChange={(e) => updateField('content', e.target.value)}
        />
      </label>

      <label>
        Customer name (optional)
        <input
          value={form.customer_name}
          onChange={(e) => updateField('customer_name', e.target.value)}
        />
      </label>

      <label>
        Customer segment (optional, e.g. SMB)
        <input
          value={form.customer_segment}
          onChange={(e) => updateField('customer_segment', e.target.value)}
        />
      </label>

      <label>
        Date it happened (optional)
        <input
          type="date"
          value={form.occurred_at}
          onChange={(e) => updateField('occurred_at', e.target.value)}
        />
      </label>

      <button type="submit" disabled={submitting}>
        {submitting ? 'Saving...' : 'Save feedback'}
      </button>

      {message && <p className={`form-message ${message.kind}`}>{message.text}</p>}
    </form>
  )
}

export default FeedbackForm
