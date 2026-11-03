import { useState, type FormEvent } from 'react'
import type { EvidenceCreate } from '../../api/investigations'
import SelectWithOther from './SelectWithOther'
import {
  EMPTY_CHOICE,
  MAX_EVIDENCE_CHARS,
  SOURCE_OPTIONS,
  TYPE_OPTIONS,
  isChoiceComplete,
  toEvidenceCreate,
} from './evidenceOptions'

const TITLE_LENGTH = 80

// The first non-empty line of the text, shortened, as a suggested title.
function firstLine(text: string): string {
  const line = text.split('\n').find((l) => l.trim() !== '') ?? ''
  return line.trim().slice(0, TITLE_LENGTH)
}

type Props = {
  onAdd: (items: EvidenceCreate[]) => Promise<void>
}

// Paste text as one piece of evidence, with a source, a type and a title.
function PasteEvidence({ onAdd }: Props) {
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  // Once the PM types their own title, stop filling it in from the text.
  const [titleEdited, setTitleEdited] = useState(false)
  const [source, setSource] = useState(EMPTY_CHOICE)
  const [type, setType] = useState(EMPTY_CHOICE)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  function handleContentChange(text: string) {
    setContent(text)
    if (!titleEdited) setTitle(firstLine(text))
    setMessage(null)
  }

  const ready =
    content.trim() !== '' && title.trim() !== '' && isChoiceComplete(source) && isChoiceComplete(type)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      await onAdd([toEvidenceCreate(title.trim(), content.trim(), source, type)])
      setMessage({ kind: 'success', text: 'Added to the tray.' })
      setContent('')
      setTitle('')
      setTitleEdited(false)
      setSource(EMPTY_CHOICE)
      setType(EMPTY_CHOICE)
    } catch (error) {
      setMessage({ kind: 'error', text: (error as Error).message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="stack-form" onSubmit={handleSubmit}>
      <label>
        Text
        <textarea
          rows={6}
          maxLength={MAX_EVIDENCE_CHARS}
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
        />
      </label>
      <label>
        Title
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            setTitleEdited(true)
          }}
        />
      </label>
      <div className="inline-fields">
        <SelectWithOther label="Source" options={SOURCE_OPTIONS} value={source} onChange={setSource} />
        <SelectWithOther label="Type" options={TYPE_OPTIONS} value={type} onChange={setType} />
      </div>
      <button type="submit" className="btn pri" disabled={!ready || saving}>
        {saving ? 'Adding…' : 'Add to tray'}
      </button>
      {message && <p className={`form-message ${message.kind}`}>{message.text}</p>}
    </form>
  )
}

export default PasteEvidence
