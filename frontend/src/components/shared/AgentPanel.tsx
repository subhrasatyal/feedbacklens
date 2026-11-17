import type { Investigation, InvestigationDetail } from '../../api/investigations'
import { LOOP_STEPS, VERDICT_NAMES } from './stations'

type Props = {
  investigation: InvestigationDetail | null
  availableCount: number
  frameworkNames: Record<string, string> // framework id -> display name
  recommending: boolean // a recommendation request is running right now
  drafting: boolean // a hypothesis-draft request is running right now
  running: boolean // an investigation run is waiting for the agent right now
  redrafting: boolean // a next-experiment redraft is waiting right now
  recent: Investigation[]
  onOpen: (id: string) => void
  onNew: () => void
}

type LoopState = { step: string; state: 'todo' | 'now' | 'done' | 'skipped'; note: string }

// The live requests that are waiting for the agent right now.
type Busy = { recommending: boolean; drafting: boolean; running: boolean; redrafting: boolean }

// Where each loop step stands, worked out only from saved state and the live requests.
// In the MVP, "Identify evidence gaps", "Execute tools" and "Reassess" all happen inside
// one approved run, so they change together.
function loopStates(
  investigation: InvestigationDetail | null,
  { recommending, drafting, running, redrafting }: Busy,
  names: Record<string, string>,
): LoopState[] {
  const accepted = investigation?.hypothesis?.status === 'accepted'
  const run = investigation?.investigation_run ?? null
  const experiment = investigation?.next_experiment ?? null
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
    if (step === 'Form hypothesis') {
      const hyp = investigation?.hypothesis ?? null
      if (drafting) return { step, state: 'now', note: 'Drafting' }
      if (hyp?.status === 'accepted') return { step, state: 'done', note: `You accepted v${hyp.version}` }
      if (hyp) return { step, state: 'now', note: `Draft v${hyp.version}` }
      if (savedId) return { step, state: 'now', note: 'Next' }
    }
    if (step === 'Propose investigation' && (accepted || run)) {
      return { step, state: 'done', note: 'Shown on station 3' }
    }
    if (step === 'Request approval') {
      if (running || run) return { step, state: 'done', note: 'You approved the run' }
      if (accepted) return { step, state: 'now', note: 'Waiting for you' }
    }
    if (step === 'Identify evidence gaps' || step === 'Execute tools' || step === 'Reassess') {
      if (running) return { step, state: 'now', note: 'Running' }
      if (run && step === 'Identify evidence gaps') {
        const gaps = run.findings.filter((f) => f.kind === 'missing' || f.kind === 'assumption').length
        return { step, state: 'done', note: `${gaps} gap${gaps === 1 ? '' : 's'} or assumption${gaps === 1 ? '' : 's'}` }
      }
      if (run && step === 'Execute tools') return { step, state: 'done', note: `Read ${run.sources_read.length} sources` }
      if (run) return { step, state: 'done', note: VERDICT_NAMES[run.verdict] }
    }
    if (step === 'Recommend next step' && run && !running) {
      if (redrafting) return { step, state: 'now', note: 'Redrafting' }
      if (experiment?.status === 'approved') return { step, state: 'done', note: `You approved v${experiment.version}` }
      if (experiment) return { step, state: 'now', note: `Proposal v${experiment.version}` }
      return { step, state: 'now', note: 'Rejected' }
    }
    return { step, state: 'todo', note: '' }
  })
}

// What the agent would honestly say right now, based only on saved state and the live requests.
function agentMessage(
  investigation: InvestigationDetail | null,
  availableCount: number,
  { recommending, drafting, running, redrafting }: Busy,
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
  const framework = savedId ? (names[savedId] ?? savedId) : ''
  if (drafting) {
    return `Drafting a hypothesis with ${framework}, reading ${sources}…`
  }
  const hyp = investigation.hypothesis
  if (running) {
    return `Testing hypothesis v${hyp?.version} with ${framework}, reading ${sources}…`
  }
  if (redrafting) {
    return 'Drafting a new next experiment from my findings and your reasons…'
  }
  const run = investigation.investigation_run
  if (run) {
    const verdict = `${VERDICT_NAMES[run.verdict]} (${run.confidence} confidence)`
    const experiment = investigation.next_experiment
    if (experiment?.status === 'approved') {
      return `Investigation finished: ${verdict}. You approved next experiment v${experiment.version}. The decision brief (station 4) isn't built yet.`
    }
    if (experiment) {
      return `Investigation finished: ${verdict}. Review the next experiment: approve it, edit it, or reject it with a reason.`
    }
    return `Investigation finished: ${verdict}. You rejected the last experiment. I can draft a new one, or you can write your own.`
  }
  if (hyp?.status === 'accepted') {
    return `You accepted hypothesis v${hyp.version}. It's still untested. Next, run the investigation: I'll read ${sources} and apply ${framework}.`
  }
  if (hyp && hyp.written_by === 'agent') {
    const cited = hyp.based_on.length
    return `I drafted hypothesis v${hyp.version} from ${cited} source${cited === 1 ? '' : 's'}. Edit it, accept it, or reject it with a reason and I'll redraft.`
  }
  if (hyp) {
    return `Hypothesis v${hyp.version} is your draft. Accept it when it's ready to investigate.`
  }
  if (savedId) {
    return `Approach saved: ${framework}. Next, I can draft a hypothesis at the bottom of the planning station.`
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
  drafting,
  running,
  redrafting,
  recent,
  onOpen,
  onNew,
}: Props) {
  const busy = { recommending, drafting, running, redrafting }
  // Missing information from the latest run: what the evidence couldn't answer.
  const missing = investigation?.investigation_run?.findings.filter((f) => f.kind === 'missing') ?? []

  return (
    <aside className="side" aria-label="Agent status">
      <section className="card">
        <span className="eyebrow">Investigation loop</span>
        <ol className="loop">
          {loopStates(investigation, busy, frameworkNames).map(({ step, state, note }) => (
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
        <p className="agent-message">{agentMessage(investigation, availableCount, busy, frameworkNames)}</p>
      </section>

      {missing.length > 0 && (
        <section className="card">
          <span className="eyebrow">Still unanswered</span>
          {missing.map((finding, index) => (
            <div key={index} className="finding missing">
              <p>{finding.statement}</p>
              <span className="tag dashed">Not in tray</span>
            </div>
          ))}
        </section>
      )}

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
