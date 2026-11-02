import { useState, type ChangeEvent } from 'react'
import type { EvidenceCreate } from '../../api/investigations'
import SelectWithOther from './SelectWithOther'
import {
  EMPTY_CHOICE,
  MAX_EVIDENCE_CHARS,
  SOURCE_OPTIONS,
  TYPE_OPTIONS,
  isChoiceComplete,
  toEvidenceCreate,
  type Choice,
} from './evidenceOptions'

// A file that's been read but not added yet, waiting for its source and type.
type StagedFile = {
  key: string
  name: string
  content: string
  source: Choice
  type: Choice
}

const ALLOWED_EXTENSIONS = ['.txt', '.md']

type Props = {
  onAdd: (items: EvidenceCreate[]) => Promise<void>
}

// Pick several text files, give each a source and a type, then add them all at once.
function FileUpload({ onAdd }: Props) {
  const [staged, setStaged] = useState<StagedFile[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target
    const files = Array.from(input.files ?? [])
    input.value = '' // so choosing the same file again still triggers this
    setMessage(null)

    const accepted: StagedFile[] = []
    const problems: string[] = []
    for (const file of files) {
      const isText = ALLOWED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))
      if (!isText) {
        problems.push(`${file.name} is not a .txt or .md file`)
        continue
      }
      // The browser reads the file; nothing is uploaded until "Add to tray".
      const content = (await file.text()).trim()
      if (content === '') {
        problems.push(`${file.name} is empty`)
      } else if (content.length > MAX_EVIDENCE_CHARS) {
        problems.push(`${file.name} is too large (over ${MAX_EVIDENCE_CHARS.toLocaleString()} characters)`)
      } else {
        accepted.push({
          key: crypto.randomUUID(),
          name: file.name,
          content,
          source: EMPTY_CHOICE,
          type: EMPTY_CHOICE,
        })
      }
    }

    setStaged([...staged, ...accepted])
    if (problems.length > 0) {
      setMessage({ kind: 'error', text: `Skipped: ${problems.join('; ')}.` })
    }
  }

  // Change one staged file's source or type, leaving the others as they were.
  function updateStaged(key: string, change: Partial<StagedFile>) {
    setStaged(staged.map((file) => (file.key === key ? { ...file, ...change } : file)))
  }

  const allTagged = staged.every((file) => isChoiceComplete(file.source) && isChoiceComplete(file.type))

  async function handleAdd() {
    setSaving(true)
    setMessage(null)
    try {
      await onAdd(staged.map((file) => toEvidenceCreate(file.name, file.content, file.source, file.type)))
      setMessage({ kind: 'success', text: `Added ${staged.length} to the tray.` })
      setStaged([])
    } catch (error) {
      setMessage({ kind: 'error', text: (error as Error).message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="upload-box">
      <h3>Upload files</h3>
      <input type="file" multiple accept=".txt,.md,text/plain,text/markdown" onChange={handleFiles} />

      {staged.length > 0 && (
        <>
          <p>Choose a source and a type for each file:</p>
          <ul className="staged-list">
            {staged.map((file) => (
              <li key={file.key}>
                <span className="staged-name">{file.name}</span>
                <SelectWithOther
                  label="Source"
                  options={SOURCE_OPTIONS}
                  value={file.source}
                  onChange={(source) => updateStaged(file.key, { source })}
                />
                <SelectWithOther
                  label="Type"
                  options={TYPE_OPTIONS}
                  value={file.type}
                  onChange={(type) => updateStaged(file.key, { type })}
                />
                <button
                  type="button"
                  onClick={() => setStaged(staged.filter((f) => f.key !== file.key))}
                >
                  Don't add
                </button>
              </li>
            ))}
          </ul>
          <button type="button" disabled={!allTagged || saving} onClick={handleAdd}>
            {saving ? 'Adding…' : `Add ${staged.length} to tray`}
          </button>
        </>
      )}

      {message && <p className={`form-message ${message.kind}`}>{message.text}</p>}
    </div>
  )
}

export default FileUpload
