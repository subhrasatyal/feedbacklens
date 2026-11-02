import ProblemForm from '../components/shared/ProblemForm'
import RecentInvestigations from '../components/shared/RecentInvestigations'
import SpecimenTray from '../components/shared/SpecimenTray'
import { useInvestigation } from '../hooks/useInvestigation'

// The plain (unthemed) view of lifecycle step 1, the Clipboard.
function ClassicView() {
  const {
    investigation,
    loading,
    error,
    recent,
    open,
    startNew,
    saveProblem,
    addEvidence,
    removeEvidence,
  } = useInvestigation()

  return (
    <>
      <section>
        <div className="section-header">
          <h2>Recent investigations</h2>
          {investigation && (
            <button type="button" onClick={startNew}>
              New investigation
            </button>
          )}
        </div>
        <RecentInvestigations
          investigations={recent}
          currentId={investigation?.id ?? null}
          onOpen={open}
        />
      </section>

      {error && <p className="form-message error">{error}</p>}

      {loading ? (
        <p>Loading investigation…</p>
      ) : (
        <>
          <section>
            <h2>1. Problem or decision</h2>
            {/* The key makes React rebuild the form when a different investigation
                opens, so its fields start from that investigation's values. */}
            <ProblemForm
              key={investigation?.id ?? 'new'}
              investigation={investigation}
              onSave={saveProblem}
            />
          </section>

          {investigation && (
            <section>
              <h2>2. Specimen tray ({investigation.evidence.length})</h2>
              <SpecimenTray
                evidence={investigation.evidence}
                onAdd={addEvidence}
                onRemove={removeEvidence}
              />
            </section>
          )}
        </>
      )}
    </>
  )
}

export default ClassicView
