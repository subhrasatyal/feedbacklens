import AgentPanel from '../components/shared/AgentPanel'
import AppShell from '../components/shared/AppShell'
import ClipboardStation from '../components/shared/ClipboardStation'
import StationNav from '../components/shared/StationNav'
import { STATIONS, type StationId } from '../components/shared/stations'
import { useInvestigation } from '../hooks/useInvestigation'

// The plain view of an investigation: the shell, the current station, and the side panel.
function ClassicView() {
  const lab = useInvestigation()
  const { investigation } = lab

  const availableCount = investigation?.evidence.filter((item) => item.use_by_agent).length ?? 0
  // The planning station needs a saved problem and at least one source the agent may read.
  const canPlan = investigation !== null && availableCount > 0

  function isOpenable(id: StationId): boolean {
    const station = STATIONS.find((s) => s.id === id)
    if (!station?.built) return false
    if (id === 'planning') return canPlan
    return true
  }

  // Never show a station that can't be opened (e.g. after unchecking every source).
  const station: StationId = isOpenable(lab.station) ? lab.station : 'clipboard'

  return (
    <AppShell
      caseTitle={investigation?.question ?? null}
      nav={<StationNav current={station} isOpenable={isOpenable} onSelect={lab.goToStation} />}
      side={
        <AgentPanel
          investigation={investigation}
          availableCount={availableCount}
          recent={lab.recent}
          onOpen={lab.open}
          onNew={lab.startNew}
        />
      }
    >
      {lab.error && <p className="form-message error">{lab.error}</p>}

      {lab.loading ? (
        <p className="muted">Loading investigation…</p>
      ) : station === 'clipboard' ? (
        <ClipboardStation
          investigation={investigation}
          canContinue={canPlan}
          onSaveProblem={lab.saveProblem}
          onAddEvidence={lab.addEvidence}
          onSetEvidenceUse={lab.setEvidenceUse}
          onRemoveEvidence={lab.removeEvidence}
          onContinue={() => lab.goToStation('planning')}
        />
      ) : (
        <div className="page-heading">
          <span className="eyebrow">Station 2 · Experiment-planning station</span>
          <h1>How should we think about this?</h1>
          <p className="muted">The planning station is the next build step.</p>
        </div>
      )}
    </AppShell>
  )
}

export default ClassicView
