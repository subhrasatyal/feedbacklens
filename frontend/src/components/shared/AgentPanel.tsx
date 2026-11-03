import type { Investigation, InvestigationDetail } from '../../api/investigations'
import { LOOP_STEPS } from './stations'

type Props = {
  investigation: InvestigationDetail | null
  availableCount: number
  frameworkNames: Record<string, string> // framework id -> display name
  recommending: boolean // a recommendation request is running right now
  recent: Investigation[]
  onOpen: (id: string) => void
  onNew: () => void
}

type LoopState = { step: string; state: 'todo' | 'now' | 'done' | 'skipped'; note: string }

// Where each loop step stands, worked out only from saved state and the live request.
// Steps after "Recommend framework" aren't built, so they always show as not started.
function loopStates(
  investigation: InvestigationDetail | null,
  recommending: boolean,
  names: Record<string, string>,
): LoopState[] {
  const rec = investigation?.recommendation ?? null
  const savedId = investigation?.framework_id ?? null
  const nameOf = (id: string) => names[id] ?? id

  return LOOP_STEPS.map((step): LoopState => {
    if (step === 'Diagnose') {
      if (recommending) return { step, state: 'now', note: 'Now' }
      if (rec) return { step, state: 'done', note: 'Done' }
      if (savedId) return { step, state: 'skipped', note: 'Skipped' }
    }
    if (step === 'Recommend framework') {
      if (rec && savedId === rec.framework_id) {
        return { step, state: 'done', note: `You accepted ${nameOf(savedId)}` }
      }
      if (savedId) return { step, state: 'done', note: `You picked ${nameOf(savedId)}` }
      if (rec) return { step, state: 'done', note: `Suggests ${nameOf(rec.framework_id)}` }
    }
    return { step, state: 'todo', note: '' }
  })
}

// What the agent would honestly say right now, based only on saved state and the live request.
function agentMessage(
  investigation: InvestigationDetail | null,
  availableCount: number,
  recommending: boolean,
  names: Record<string, string>,
) {
  if (investigation === null) {
    return 'Waiting for a problem. Describe it on the clipboard to start.'
  }
  if (availableCount === 0) {
    return 'No sources checked yet. Add evidence and tick Use for the sources I may read.'
  }
  const sources = availableCount === 1 ? '1 checked source' : `${availableCount} checked sources`
  if (recommending) {
    return `Reading ${sources} to diagnose the problem…`
  }
  const savedId = investigation.framework_id
  if (savedId) {
    return `Approach saved: ${names[savedId] ?? savedId}. I'll apply it on the hypothesis board, which isn't built yet.`
  }
  const rec = investigation.recommendation
  if (rec) {
    const read = rec.sources_read.length
    return `Read ${read} source${read === 1 ? '' : 's'}. I recommend ${names[rec.framework_id] ?? rec.framework_id} (${rec.confidence} confidence). You can override.`
  }
  return `${sources} ready. I haven't read them yet; I'll read them when you ask me to diagnose at the planning station.`
}

// The side panel: the investigation loop, the agent's status, and work to resume.
function AgentPanel({
  investigation,
  availableCount,
  frameworkNames,
  recommending,
  recent,
  onOpen,
  onNew,
}: Props) {
  return (
    <aside className="side" aria-label="Agent status">
      <section className="card">
        <span className="eyebrow">Investigation loop</span>
        <ol className="loop">
          {loopStates(investigation, recommending, frameworkNames).map(({ step, state, note }) => (
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
        <p className="agent-message">{agentMessage(investigation, availableCount, recommending, frameworkNames)}</p>
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
