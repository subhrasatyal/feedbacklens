import type { Investigation, InvestigationDetail } from '../../api/investigations'
import { LOOP_STEPS } from './stations'

type Props = {
  investigation: InvestigationDetail | null
  availableCount: number
  savedFrameworkName: string | null // the approach saved at the Planning station, if any
  recent: Investigation[]
  onOpen: (id: string) => void
  onNew: () => void
}

type LoopState = { step: string; state: 'todo' | 'done' | 'skipped'; note: string }

// Where each loop step stands, worked out only from saved state.
// The agent hasn't run yet, so no step is ever "done" by the agent here.
function loopStates(savedFrameworkName: string | null): LoopState[] {
  return LOOP_STEPS.map((step) => {
    if (savedFrameworkName && step === 'Diagnose') {
      return { step, state: 'skipped', note: 'Skipped' }
    }
    if (savedFrameworkName && step === 'Recommend framework') {
      return { step, state: 'done', note: `You picked ${savedFrameworkName}` }
    }
    return { step, state: 'todo', note: '' }
  })
}

// What the agent would honestly say right now, based only on saved state.
// The agent isn't built yet, so it never claims to have read anything.
function agentMessage(
  investigation: InvestigationDetail | null,
  availableCount: number,
  savedFrameworkName: string | null,
) {
  if (investigation === null) {
    return 'Waiting for a problem. Describe it on the clipboard to start.'
  }
  if (availableCount === 0) {
    return 'No sources checked yet. Add evidence and tick Use for the sources I may read.'
  }
  if (savedFrameworkName) {
    return `Approach saved: ${savedFrameworkName}. I'll apply it on the hypothesis board, which isn't built yet.`
  }
  const sources = availableCount === 1 ? '1 checked source' : `${availableCount} checked sources`
  return `${sources} ready. I haven't read them yet; I'll read them when you ask me to diagnose at the planning station.`
}

// The side panel: the investigation loop, the agent's status, and work to resume.
function AgentPanel({
  investigation,
  availableCount,
  savedFrameworkName,
  recent,
  onOpen,
  onNew,
}: Props) {
  return (
    <aside className="side" aria-label="Agent status">
      <section className="card">
        <span className="eyebrow">Investigation loop</span>
        <ol className="loop">
          {loopStates(savedFrameworkName).map(({ step, state, note }) => (
            <li key={step} className={`loop-item ${state}`}>
              <span className="dot" aria-hidden="true" />
              <span className="loop-step">{step}</span>
              {note && <span className="loop-note">{note}</span>}
            </li>
          ))}
        </ol>
      </section>

      <section className="card">
        <span className="eyebrow">Agent</span>
        <p className="agent-message">{agentMessage(investigation, availableCount, savedFrameworkName)}</p>
      </section>

      <section className="card">
        <div className="card-header">
          <span className="eyebrow">Resume work</span>
          {investigation && (
            <button type="button" className="btn small" onClick={onNew}>
              New investigation
            </button>
          )}
        </div>
        {recent.length === 0 ? (
          <p className="muted">No investigations yet.</p>
        ) : (
          <ul className="resume-list">
            {recent.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={item.id === investigation?.id ? 'resume-item current' : 'resume-item'}
                  onClick={() => onOpen(item.id)}
                >
                  <span className="resume-question">{item.question}</span>
                  <span className="muted">
                    {item.requested_by} · decide by {item.decision_deadline}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  )
}

export default AgentPanel
