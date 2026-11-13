import { useState, type FormEvent } from 'react'
import type { Framework } from '../../api/frameworks'
import type {
  ApproachInput,
  HypothesisEdit,
  InvestigationDetail,
  Mode,
} from '../../api/investigations'
import ApproachQuestions from './ApproachQuestions'
import FrameworkLibrary from './FrameworkLibrary'
import HypothesisCard from './HypothesisCard'
import RecommendationCard from './RecommendationCard'

type Props = {
  investigation: InvestigationDetail
  frameworks: Framework[]
  frameworksError: string | null
  recommending: boolean
  drafting: boolean
  onSaveApproach: (input: ApproachInput) => Promise<void>
  onRequestRecommendation: () => Promise<void>
  onDraftHypothesis: () => Promise<void>
  onSaveHypothesis: (input: HypothesisEdit) => Promise<void>
  onAcceptHypothesis: () => Promise<void>
  onRejectHypothesis: (reason: string) => Promise<void>
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
function PlanningStation({
  investigation,
  frameworks,
  frameworksError,
  recommending,
  drafting,
  onSaveApproach,
  onRequestRecommendation,
  onDraftHypothesis,
  onSaveHypothesis,
  onAcceptHypothesis,
  onRejectHypothesis,
}: Props) {
  // Start from what's saved, so reopening the station shows the saved choice.
  const [mode, setMode] = useState<Mode | null>(investigation.mode)
  const [selectedId, setSelectedId] = useState<string | null>(investigation.framework_id)
  const [answers, setAnswers] = useState<Record<string, string>>(investigation.framework_inputs)
  // Answers the agent drafted that the PM hasn't edited yet, with the labels they cite.
  const [suggested, setSuggested] = useState<Record<string, string[]>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [agentError, setAgentError] = useState<string | null>(null)

  const recommendation = investigation.recommendation
  const checkedLabels = investigation.evidence
    .filter((item) => item.use_by_agent)
    .map((item) => item.source_label)
  const selected = frameworks.find((f) => f.id === selectedId) ?? null
  const savedFramework = frameworks.find((f) => f.id === investigation.framework_id) ?? null
  const unanswered = selected?.pm_inputs.filter((q) => q.required && !answers[q.id]?.trim()) ?? []
  const canSave = mode !== null && selected !== null && unanswered.length === 0

  function selectFramework(id: string) {
    setSelectedId(id)
    // Choosing from the library without a mode means "I'll pick".
    if (mode === null) setMode('pick')
    setMessage(null)

    // Fill in the agent's drafts for this framework's questions, but never over the PM's own text.
    const framework = frameworks.find((f) => f.id === id)
    if (!recommendation || !framework) return
    const nextAnswers = { ...answers }
    const nextSuggested = { ...suggested }
    for (const draft of recommendation.suggested_answers) {
      const asked = framework.pm_inputs.some((q) => q.id === draft.question_id)
      if (asked && !nextAnswers[draft.question_id]?.trim()) {
        nextAnswers[draft.question_id] = draft.answer
        nextSuggested[draft.question_id] = draft.evidence_refs
      }
    }
    setAnswers(nextAnswers)
    setSuggested(nextSuggested)
  }

  function changeAnswer(id: string, text: string) {
    setAnswers({ ...answers, [id]: text })
    // Once the PM edits a draft, it's their answer.
    const rest = { ...suggested }
    delete rest[id]
    setSuggested(rest)
    setMessage(null)
  }

  function runAgent() {
    setAgentError(null)
    onRequestRecommendation().catch((error: Error) => setAgentError(error.message))
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    // Same as canSave, written out so TypeScript knows mode and selected aren't empty below.
    if (mode === null || selected === null || unanswered.length > 0) return
    // Saving confirms the drafts shown on screen. Drafts for questions not on screen are dropped.
    const shown = new Set(selected.pm_inputs.map((q) => q.id))
    const toSave = Object.fromEntries(
      Object.entries(answers).filter(([id]) => shown.has(id) || !(id in suggested)),
    )
    setSaving(true)
    setMessage(null)
    try {
      await onSaveApproach({ mode, framework_id: selected.id, framework_inputs: toSave })
      setSuggested({})
      setMessage({
        kind: 'success',
        text: 'Approach saved. Next, form the hypothesis below.',
      })
    } catch (error) {
      setMessage({ kind: 'error', text: (error as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const sources = checkedLabels.length === 1 ? '1 checked source' : `${checkedLabels.length} checked sources`

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

      {mode === 'recommend' && !recommendation && (
        <section className="card note-card">
          <span className="eyebrow">Agent recommendation</span>
          <p className="agent-message">
            I'll read the {sources} ({checkedLabels.join(', ')}), diagnose the problem and recommend
            one of the five frameworks, with my reasons. This takes about a minute.
          </p>
          <button
            type="button"
            className="btn pri saved-tag"
            disabled={recommending}
            onClick={runAgent}
          >
            {recommending ? `Diagnosing… reading ${sources}` : 'Diagnose and recommend'}
          </button>
        </section>
      )}

      {mode === 'recommend' && recommendation && (
        <RecommendationCard
          recommendation={recommendation}
          frameworks={frameworks}
          checkedLabels={checkedLabels}
          selectedId={selectedId}
          recommending={recommending}
          onChoose={selectFramework}
          onRerun={runAgent}
        />
      )}

      {mode === 'recommend' && agentError && <p className="form-message error">{agentError}</p>}

      <section className="page-heading">
        <h2 className="h">{mode === 'recommend' ? 'Or choose a framework' : 'Choose a framework'}</h2>
      </section>
      {frameworksError ? (
        <p className="form-message error">{frameworksError}</p>
      ) : (
        <FrameworkLibrary
          frameworks={frameworks}
          selectedId={selectedId}
          recommendedId={mode === 'recommend' ? (recommendation?.framework_id ?? null) : null}
          onSelect={selectFramework}
        />
      )}

      {selected && (
        <form className="card" onSubmit={handleSave} aria-labelledby="before-heading">
          <h2 className="h" id="before-heading">
            Before we start: {selected.name}
          </h2>
          <ApproachQuestions
            framework={selected}
            answers={answers}
            suggested={suggested}
            onChange={changeAnswer}
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

      {investigation.framework_id && (
        <HypothesisCard
          investigation={investigation}
          frameworkNames={Object.fromEntries(frameworks.map((f) => [f.id, f.name]))}
          drafting={drafting}
          onDraft={onDraftHypothesis}
          onSave={onSaveHypothesis}
          onAccept={onAcceptHypothesis}
          onReject={onRejectHypothesis}
        />
      )}
    </>
  )
}

export default PlanningStation
