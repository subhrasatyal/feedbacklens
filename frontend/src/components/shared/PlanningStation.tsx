import { useState, type FormEvent } from 'react'
import type { Framework } from '../../api/frameworks'
import type { ApproachInput, InvestigationDetail, Mode } from '../../api/investigations'
import ApproachQuestions from './ApproachQuestions'
import FrameworkLibrary from './FrameworkLibrary'

type Props = {
  investigation: InvestigationDetail
  frameworks: Framework[]
  frameworksError: string | null
  onSaveApproach: (input: ApproachInput) => Promise<void>
}

const MODES: { value: Mode; title: string; detail: string }[] = [
  { value: 'pick', title: "I'll pick a framework", detail: 'Run A: you choose and the agent applies it.' },
  {
    value: 'recommend',
    title: 'Recommend one for me',
    detail: 'Run B: the agent diagnoses first, then explains its pick.',
  },
]

// Station 2: choose how to think about the problem.
function PlanningStation({ investigation, frameworks, frameworksError, onSaveApproach }: Props) {
  // Start from what's saved, so reopening the station shows the saved choice.
  const [mode, setMode] = useState<Mode | null>(investigation.mode)
  const [selectedId, setSelectedId] = useState<string | null>(investigation.framework_id)
  const [answers, setAnswers] = useState<Record<string, string>>(investigation.framework_inputs)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const selected = frameworks.find((f) => f.id === selectedId) ?? null
  const savedFramework = frameworks.find((f) => f.id === investigation.framework_id) ?? null
  const unanswered = selected?.pm_inputs.filter((q) => q.required && !answers[q.id]?.trim()) ?? []
  const canSave = mode !== null && selected !== null && unanswered.length === 0

  function selectFramework(id: string) {
    setSelectedId(id)
    // Choosing from the library without a mode means "I'll pick".
    if (mode === null) setMode('pick')
    setMessage(null)
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    // Same as canSave, written out so TypeScript knows mode and selected aren't empty below.
    if (mode === null || selected === null || unanswered.length > 0) return
    setSaving(true)
    setMessage(null)
    try {
      await onSaveApproach({ mode, framework_id: selected.id, framework_inputs: answers })
      setMessage({
        kind: 'success',
        text: 'Approach saved. The hypothesis board is the next station to build.',
      })
    } catch (error) {
      setMessage({ kind: 'error', text: (error as Error).message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">Station 2 · Experiment-planning station</span>
        <h1>How should we think about this?</h1>
        <p className="muted">
          Pick a framework yourself, or let the agent diagnose the problem and recommend one.
        </p>
        {savedFramework && (
          <span className="tag accent saved-tag">Saved approach: {savedFramework.name}</span>
        )}
      </div>

      <fieldset className="mode-options">
        <legend className="eyebrow">Mode</legend>
        {MODES.map((option) => (
          <label
            key={option.value}
            className={mode === option.value ? 'card mode-option selected' : 'card mode-option'}
          >
            <input
              type="radio"
              name="mode"
              value={option.value}
              checked={mode === option.value}
              onChange={() => {
                setMode(option.value)
                setMessage(null)
              }}
            />
            <span>
              <strong>{option.title}</strong>
              <br />
              <span className="muted">{option.detail}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {mode === 'recommend' && (
        <section className="card note-card">
          <span className="eyebrow">Agent recommendation</span>
          <p className="agent-message">
            The agent isn't connected yet, so it can't diagnose or recommend. That's the next build
            step. You can still choose a framework below.
          </p>
        </section>
      )}

      <section className="page-heading">
        <h2 className="h">{mode === 'recommend' ? 'Or choose a framework' : 'Choose a framework'}</h2>
      </section>
      {frameworksError ? (
        <p className="form-message error">{frameworksError}</p>
      ) : (
        <FrameworkLibrary frameworks={frameworks} selectedId={selectedId} onSelect={selectFramework} />
      )}

      {selected && (
        <form className="card" onSubmit={handleSave} aria-labelledby="before-heading">
          <h2 className="h" id="before-heading">
            Before we start: {selected.name}
          </h2>
          <ApproachQuestions
            framework={selected}
            answers={answers}
            onChange={(id, text) => {
              setAnswers({ ...answers, [id]: text })
              setMessage(null)
            }}
          />
          <div className="row">
            <button type="submit" className="btn pri" disabled={!canSave || saving}>
              {saving ? 'Saving…' : 'Save approach'}
            </button>
            {!canSave && unanswered.length > 0 && (
              <span className="muted">Answer the required question to continue.</span>
            )}
          </div>
          {message && <p className={`form-message ${message.kind}`}>{message.text}</p>}
        </form>
      )}
    </>
  )
}

export default PlanningStation
