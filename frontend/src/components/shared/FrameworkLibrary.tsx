import type { Framework } from '../../api/frameworks'

type Props = {
  frameworks: Framework[]
  selectedId: string | null
  onSelect: (id: string) => void
}

// The five framework cards: what it is, when to use it, when to avoid it, and Select.
function FrameworkLibrary({ frameworks, selectedId, onSelect }: Props) {
  return (
    <div className="framework-grid">
      {frameworks.map((framework) => {
        const selected = framework.id === selectedId
        return (
          <div key={framework.id} className={selected ? 'card framework-card selected' : 'card framework-card'}>
            <div className="card-header">
              <strong>{framework.name}</strong>
              {selected && <span className="tag accent">Selected</span>}
            </div>
            <p className="muted">{framework.what}</p>
            <p className="muted">
              <strong className="strong">Use when:</strong> {framework.use_when}
            </p>
            <p className="muted">
              <strong className="strong">Avoid when:</strong> {framework.avoid_when}
            </p>
            <button
              type="button"
              className="btn small"
              aria-pressed={selected}
              onClick={() => onSelect(framework.id)}
            >
              {selected ? 'Selected' : 'Select'}
            </button>
          </div>
        )
      })}
    </div>
  )
}

export default FrameworkLibrary
