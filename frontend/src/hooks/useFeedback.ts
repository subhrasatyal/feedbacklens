import { useCallback, useEffect, useState } from 'react'
import { listFeedback, type Feedback } from '../api/feedback'

// Theme filter values: every item, items with no theme yet, or one theme's name.
export const ALL_THEMES = 'all'
export const NO_THEME = 'no-theme'

export type ThemeCount = { theme: string; count: number }

// Shared memory for the feedback page: the list of feedback, whether it's
// still loading or failed, and which theme is selected. Call it once (in App)
// and pass the results down, so every component sees the same data.
export function useFeedback() {
  const [items, setItems] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTheme, setSelectedTheme] = useState<string>(ALL_THEMES)

  // Ask the backend for the latest list. Also called after saving new feedback.
  // State only changes once the reply arrives (inside .then/.catch/.finally).
  const refresh = useCallback(() => {
    return listFeedback()
      .then((data) => {
        setItems(data)
        setError(null)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // Load the list once when the page opens.
  useEffect(() => {
    refresh()
  }, [refresh])

  // Everything below is worked out from `items` on every render, so it is
  // always in step with the list. The data set is small, so this is cheap.

  // How many items have each theme, most common first.
  const counts: Record<string, number> = {}
  for (const item of items) {
    if (item.theme) counts[item.theme] = (counts[item.theme] ?? 0) + 1
  }
  const themeCounts: ThemeCount[] = Object.entries(counts)
    .map(([theme, count]) => ({ theme, count }))
    .sort((a, b) => b.count - a.count || a.theme.localeCompare(b.theme))

  const noThemeCount = items.filter((item) => !item.theme).length

  // The items that match the selected theme.
  const visibleItems = items.filter((item) => {
    if (selectedTheme === ALL_THEMES) return true
    if (selectedTheme === NO_THEME) return !item.theme
    return item.theme === selectedTheme
  })

  return {
    items,
    loading,
    error,
    refresh,
    selectedTheme,
    setSelectedTheme,
    visibleItems,
    themeCounts,
    noThemeCount,
  }
}
