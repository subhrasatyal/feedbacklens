import type {
  EvidenceCreate,
  InvestigationDetail,
  InvestigationInput,
} from '../../api/investigations'
import ProblemForm from './ProblemForm'
import SpecimenTray from './SpecimenTray'

type Props = {
  investigation: InvestigationDetail | null
  canContinue: boolean // problem saved and at least one source checked
  onSaveProblem: (input: InvestigationInput) => Promise<void>
  onAddEvidence: (items: EvidenceCreate[]) => Promise<void>
  onSetEvidenceUse: (evidenceId: string, useByAgent: boolean) => Promise<void>
  onRemoveEvidence: (evidenceId: string) => Promise<void>
  onContinue: () => void
}

// Station 1: the lab clipboard, with the problem and the specimen tray.
function ClipboardStation({
  investigation,
  canContinue,
  onSaveProblem,
  onAddEvidence,
  onSetEvidenceUse,
  onRemoveEvidence,
  onContinue,
}: Props) {
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">Station 1 · Lab clipboard</span>
        <h1>What are we investigating?</h1>
        <p className="muted">
          State the decision in your own words. The agent will diagnose it before suggesting
          anything.
        </p>
      </div>

      {/* The key makes React rebuild the form when a different investigation
          opens, so its fields start from that investigation's values. */}
      <ProblemForm
        key={investigation?.id ?? 'new'}
        investigation={investigation}
        onSave={onSaveProblem}
      />

      {investigation ? (
        <SpecimenTray
          evidence={investigation.evidence}
          onAdd={onAddEvidence}
          onSetUse={onSetEvidenceUse}
          onRemove={onRemoveEvidence}
        />
      ) : (
        <p className="muted">Start the investigation to open the specimen tray.</p>
      )}

      <div className="actions">
        {investigation && !canContinue && (
          <span className="muted">Check at least one source to continue.</span>
        )}
        <button type="button" className="btn pri" disabled={!canContinue} onClick={onContinue}>
          Next: choose approach
        </button>
      </div>
    </>
  )
}

export default ClipboardStation
