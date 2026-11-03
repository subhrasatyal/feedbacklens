import type { Evidence, EvidenceCreate } from '../../api/investigations'
import EvidenceTable from './EvidenceTable'
import FileUpload from './FileUpload'
import PasteEvidence from './PasteEvidence'

type Props = {
  evidence: Evidence[]
  onAdd: (items: EvidenceCreate[]) => Promise<void>
  onSetUse: (evidenceId: string, useByAgent: boolean) => Promise<void>
  onRemove: (evidenceId: string) => Promise<void>
}

// Clipboard section 2: the evidence for this investigation, and ways to add more.
function SpecimenTray({ evidence, onAdd, onSetUse, onRemove }: Props) {
  const available = evidence.filter((item) => item.use_by_agent).length

  return (
    <section className="card" aria-labelledby="tray-heading">
      <div className="card-header">
        <div>
          <h2 className="h" id="tray-heading">
            Specimen tray
          </h2>
          <p className="muted">Evidence the agent may read. Only checked sources are used.</p>
        </div>
        <span className="tag">
          {available} of {evidence.length} available to agent
        </span>
      </div>

      <FileUpload onAdd={onAdd} />

      <details className="paste-details">
        <summary>Or paste text</summary>
        <PasteEvidence onAdd={onAdd} />
      </details>

      <EvidenceTable evidence={evidence} onSetUse={onSetUse} onRemove={onRemove} />
    </section>
  )
}

export default SpecimenTray
