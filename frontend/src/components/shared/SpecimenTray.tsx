import type { Evidence, EvidenceCreate } from '../../api/investigations'
import EvidenceTable from './EvidenceTable'
import FileUpload from './FileUpload'
import PasteEvidence from './PasteEvidence'

type Props = {
  evidence: Evidence[]
  onAdd: (items: EvidenceCreate[]) => Promise<void>
  onRemove: (evidenceIds: string[]) => Promise<void>
}

// Clipboard section 2: the evidence for this investigation, and ways to add more.
function SpecimenTray({ evidence, onAdd, onRemove }: Props) {
  return (
    <>
      <EvidenceTable evidence={evidence} onRemove={onRemove} />
      <h3>Add evidence</h3>
      <FileUpload onAdd={onAdd} />
      <PasteEvidence onAdd={onAdd} />
    </>
  )
}

export default SpecimenTray
