import type { Feedback } from '../../api/feedback'
import { ALL_THEMES, type ThemeCount } from '../../hooks/useFeedback'
import FeedbackCard from './FeedbackCard'
import ThemeFilter from './ThemeFilter'

type Props = {
  allItems: Feedback[]
  visibleItems: Feedback[]
  loading: boolean
  error: string | null
  selectedTheme: string
  onThemeChange: (theme: string) => void
  themeCounts: ThemeCount[]
  noThemeCount: number
}

function FeedbackList({
  allItems,
  visibleItems,
  loading,
  error,
  selectedTheme,
  onThemeChange,
  themeCounts,
  noThemeCount,
}: Props) {
  const isFiltered = selectedTheme !== ALL_THEMES

  return (
    <section className="feedback-list">
      <div className="list-header">
        <h2>
          Feedback ({isFiltered ? `${visibleItems.length} of ${allItems.length}` : allItems.length})
        </h2>
        <ThemeFilter
          value={selectedTheme}
          onChange={onThemeChange}
          totalCount={allItems.length}
          themeCounts={themeCounts}
          noThemeCount={noThemeCount}
        />
      </div>

      {loading && <p>Loading feedback…</p>}
      {error && <p className="form-message error">Couldn't load feedback: {error}</p>}
      {!loading && !error && allItems.length === 0 && (
        <p>No feedback yet. Add some with the form above.</p>
      )}
      {allItems.length > 0 && visibleItems.length === 0 && (
        <p>
          Nothing matches this theme.{' '}
          <button type="button" className="link-button inline" onClick={() => onThemeChange(ALL_THEMES)}>
            Show all
          </button>
        </p>
      )}

      {visibleItems.map((item) => (
        <FeedbackCard key={item.id} item={item} />
      ))}
    </section>
  )
}

export default FeedbackList
