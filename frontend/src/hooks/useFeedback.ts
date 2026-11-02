import { useCallback, useEffect, useState } from 'react'
import { listFeedback, type Feedback } from '../api/feedback'

// Shared memory for the feedback page: the list of feedback and whether it's
// still loading or failed. Call it once (in App) and pass the results down,
// so every component sees the same data.
export function useFeedback() {
  const [items, setItems] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  return { items, loading, error, refresh }
}
