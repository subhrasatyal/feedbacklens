import { useState } from 'react'
import type { Feedback } from '../../api/feedback'

// How each source type is written on the card.
const SOURCE_LABELS: Record<Feedback['source_type'], string> = {
  interview: 'Interview',
  support_ticket: 'Support ticket',
  metric: 'Metric',
  document: 'Document',
}

const PREVIEW_LENGTH = 200

function FeedbackCard({ item }: { item: Feedback }) {
  // Long content starts collapsed so the list stays easy to scan.
  const [expanded, setExpanded] = useState(false)
  const isLong = item.content.length > PREVIEW_LENGTH
  const shownText =
    isLong && !expanded ? item.content.slice(0, PREVIEW_LENGTH).trimEnd() + '…' : item.content

  // e.g. "Acme (SMB)", "Acme", "SMB", or nothing.
  const customer = [
    item.customer_name,
    item.customer_segment && item.customer_name
      ? `(${item.customer_segment})`
      : item.customer_segment,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <article className="feedback-card">
      <p className="card-meta">
        <strong>{item.source_label}</strong> · {SOURCE_LABELS[item.source_type]}
        {customer && ` · ${customer}`}
      </p>
      <h3>{item.title}</h3>
      <p className="card-preview">{shownText}</p>
      {isLong && (
        <button type="button" className="link-button" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Show less' : 'Show full text'}
        </button>
      )}

      {/* AI fields are empty until analysis runs. Show the ones that exist;
          if there are none, say so instead of guessing. */}
      <div className="badges">
        {item.theme && <span className="badge">{item.theme}</span>}
        {item.sentiment && <span className="badge">{item.sentiment}</span>}
        {item.urgency && <span className="badge">{item.urgency} urgency</span>}
        {!item.theme && !item.sentiment && !item.urgency && (
          <span className="badge muted">Not analyzed yet</span>
        )}
      </div>
    </article>
  )
}

export default FeedbackCard
