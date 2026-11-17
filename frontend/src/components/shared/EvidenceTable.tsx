import { useState } from 'react'
import type { Evidence } from '../../api/investigations'
import { typeLabel } from './evidenceOptions'

type Props = {
  evidence: Evidence[]
  onSetUse: (evidenceId: string, useByAgent: boolean) => Promise<void>
  onRemove: (evidenceId: string) => Promise<void>
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).length
}

// The specimen tray as a table: Use | Label | Source | Type | Size | Status | Remove.
// Use is saved: only checked evidence is available to the agent.
function EvidenceTable({ evidence, onSetUse, onRemove }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null) // row being saved or removed
  const [error, setError] = useState<string | null>(null)

  async function toggleUse(item: Evidence) {
    setBusyId(item.id)
    setError(null)
    try {
      await onSetUse(item.id, !item.use_by_agent)
    } catch (err) {
      setError(`Couldn't change ${item.source_label}: ${(err as Error).message}`)
    } finally {
      setBusyId(null)
    }
  }

  async function remove(item: Evidence) {
    if (!window.confirm(`Remove ${item.source_label}? This can't be undone.`)) return
    setBusyId(item.id)
    setError(null)
    try {
      await onRemove(item.id)
    } catch (err) {
      setError(`Couldn't remove ${item.source_label}: ${(err as Error).message}`)
    } finally {
      setBusyId(null)
    }
  }

  if (evidence.length === 0) {
    return <p className="muted">The tray is empty. Drop files above or paste text.</p>
  }

  return (
    <>
      <div className="table-scroll">
        <table className="evidence-table">
          <thead>
            <tr>
              <th>Use</th>
              <th>Label</th>
              <th>Source</th>
              <th>Type</th>
              <th>Size</th>
              <th>Status</th>
              <th>
                <span className="visually-hidden">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {evidence.map((item) => (
              <tr key={item.id} className={item.use_by_agent ? undefined : 'excluded'}>
                <td>
                  <input
                    type="checkbox"
                    aria-label={`Agent may use ${item.source_label}`}
                    checked={item.use_by_agent}
                    disabled={busyId === item.id}
                    onChange={() => toggleUse(item)}
                  />
                </td>
                <td>
                  <strong>{item.source_label}</strong>
                </td>
                <td>{item.origin ?? '—'}</td>
                <td>{typeLabel(item)}</td>
                <td>{wordCount(item.content).toLocaleString()} words</td>
                <td>
                  <span className={item.use_by_agent ? 'tag' : 'tag dashed'}>
                    {item.use_by_agent ? 'Available' : 'Excluded'}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    className="btn small"
                    disabled={busyId === item.id}
                    onClick={() => remove(item)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && <p className="form-message error">{error}</p>}
    </>
  )
}

export default EvidenceTable
