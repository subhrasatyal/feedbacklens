import { useState } from 'react'
import type { Evidence } from '../../api/investigations'
import { typeLabel } from './evidenceOptions'

type Props = {
  evidence: Evidence[]
  onRemove: (evidenceIds: string[]) => Promise<void>
}

// The specimen tray as a table: Use (select rows) | Label | Source | Type | Remove.
function EvidenceTable({ evidence, onRemove }: Props) {
  // Ids of the rows ticked in the Use column. Temporary; not saved.
  const [selected, setSelected] = useState<string[]>([])
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Ignore ticks on rows that no longer exist (e.g. just removed).
  const selectedIds = selected.filter((id) => evidence.some((item) => item.id === id))
  const allSelected = evidence.length > 0 && selectedIds.length === evidence.length

  function toggleRow(id: string) {
    setSelected(selectedIds.includes(id) ? selectedIds.filter((s) => s !== id) : [...selectedIds, id])
  }

  function toggleAll() {
    setSelected(allSelected ? [] : evidence.map((item) => item.id))
  }

  async function remove(ids: string[]) {
    const what = ids.length === 1 ? 'this piece of evidence' : `${ids.length} pieces of evidence`
    if (!window.confirm(`Remove ${what}? This can't be undone.`)) return

    setRemoving(true)
    setError(null)
    try {
      await onRemove(ids)
      setSelected(selectedIds.filter((id) => !ids.includes(id)))
    } catch (err) {
      setError(`Couldn't remove everything: ${(err as Error).message}`)
    } finally {
      setRemoving(false)
    }
  }

  if (evidence.length === 0) {
    return <p>The tray is empty. Upload files or paste text below.</p>
  }

  return (
    <>
      <div className="table-toolbar">
        <button
          type="button"
          disabled={selectedIds.length === 0 || removing}
          onClick={() => remove(selectedIds)}
        >
          Remove selected ({selectedIds.length})
        </button>
      </div>

      <table className="evidence-table">
        <thead>
          <tr>
            <th>
              <label className="use-header">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={allSelected}
                  onChange={toggleAll}
                />
                Use
              </label>
            </th>
            <th>Label</th>
            <th>Source</th>
            <th>Type</th>
            <th>
              <span className="visually-hidden">Remove</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {evidence.map((item) => (
            <tr key={item.id} className={selectedIds.includes(item.id) ? 'selected' : undefined}>
              <td>
                <input
                  type="checkbox"
                  aria-label={`Select ${item.source_label}`}
                  checked={selectedIds.includes(item.id)}
                  onChange={() => toggleRow(item.id)}
                />
              </td>
              <td>
                <strong>{item.source_label}</strong>
              </td>
              <td>{item.origin ?? '—'}</td>
              <td>{typeLabel(item)}</td>
              <td>
                <button type="button" disabled={removing} onClick={() => remove([item.id])}>
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {error && <p className="form-message error">{error}</p>}
    </>
  )
}

export default EvidenceTable
