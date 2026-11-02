import type { Investigation } from '../../api/investigations'

type Props = {
  investigations: Investigation[]
  currentId: string | null
  onOpen: (id: string) => void
}

// A list of saved investigations, most recently changed first. Click one to resume it.
function RecentInvestigations({ investigations, currentId, onOpen }: Props) {
  if (investigations.length === 0) {
    return <p>No investigations yet. Start one below.</p>
  }

  return (
    <ul className="recent-list">
      {investigations.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            className={item.id === currentId ? 'recent-item current' : 'recent-item'}
            onClick={() => onOpen(item.id)}
          >
            <span className="recent-question">{item.question}</span>
            <span className="recent-meta">
              Asked by {item.requested_by} · decide by {item.decision_deadline}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export default RecentInvestigations
