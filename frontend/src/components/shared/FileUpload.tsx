import { useRef, useState, type DragEvent } from 'react'
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

// Drop or browse for several text files, give each a source and a type, then add them all.
function FileUpload({ onAdd }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false) // a file is being dragged over the zone
  const [staged, setStaged] = useState<StagedFile[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  // Read the chosen or dropped files in the browser. Nothing is sent until "Add".
  async function stageFiles(files: File[]) {
    setMessage(null)
    const accepted: StagedFile[] = []
    const problems: string[] = []
    for (const file of files) {
      const isText = ALLOWED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))
      if (!isText) {
        problems.push(`${file.name} is not a .txt or .md file`)
        continue
      }
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
    setStaged((current) => [...current, ...accepted])
    if (problems.length > 0) {
      setMessage({ kind: 'error', text: `Skipped: ${problems.join('; ')}.` })
    }
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault() // stop the browser opening the file itself
    setDragging(false)
    stageFiles(Array.from(event.dataTransfer.files))
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
    <div>
      <div
        className={dragging ? 'drop-zone dragging' : 'drop-zone'}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        {/* Upload icon */}
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 16V4M7 9l5-5 5 5" />
          <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
        </svg>
        <span className="drop-title">Drop interviews, support tickets, metrics or docs</span>
        <span className="muted">.txt or .md files</span>
        <button type="button" className="btn" onClick={() => fileInput.current?.click()}>
          Browse files
        </button>
        {/* The real file picker, hidden; the button above opens it. */}
        <input
          ref={fileInput}
          type="file"
          multiple
          hidden
          accept=".txt,.md,text/plain,text/markdown"
          onChange={(e) => {
            stageFiles(Array.from(e.target.files ?? []))
            e.target.value = '' // so choosing the same file again still works
          }}
        />
      </div>

      {staged.length > 0 && (
        <div className="staged">
          <p className="muted">Choose a source and a type for each file:</p>
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
                  className="btn small"
                  onClick={() => setStaged(staged.filter((f) => f.key !== file.key))}
                >
                  Don't add
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="btn pri" disabled={!allTagged || saving} onClick={handleAdd}>
            {saving ? 'Adding…' : `Add ${staged.length} to tray`}
          </button>
        </div>
      )}

      {message && <p className={`form-message ${message.kind}`}>{message.text}</p>}
    </div>
  )
}

export default FileUpload
