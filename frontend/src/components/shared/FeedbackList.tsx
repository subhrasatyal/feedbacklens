import type { Feedback } from '../../api/feedback'
import FeedbackCard from './FeedbackCard'

type Props = {
  items: Feedback[]
  loading: boolean
  error: string | null
}

function FeedbackList({ items, loading, error }: Props) {
  return (
    <section className="feedback-list">
      <h2>Feedback ({items.length})</h2>

      {loading && <p>Loading feedback…</p>}
      {error && <p className="form-message error">Couldn't load feedback: {error}</p>}
      {!loading && !error && items.length === 0 && (
        <p>No feedback yet. Add some with the form above.</p>
      )}

      {items.map((item) => (
        <FeedbackCard key={item.id} item={item} />
      ))}
    </section>
  )
}

export default FeedbackList
