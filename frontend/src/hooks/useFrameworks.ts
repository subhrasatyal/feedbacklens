import { useEffect, useState } from 'react'
import { listFrameworks, type Framework } from '../api/frameworks'

// The framework library, loaded once. It doesn't change while the app runs.
export function useFrameworks() {
  const [frameworks, setFrameworks] = useState<Framework[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listFrameworks()
      .then(setFrameworks)
      .catch((err: Error) => setError(err.message))
  }, [])

  return { frameworks, error }
}
