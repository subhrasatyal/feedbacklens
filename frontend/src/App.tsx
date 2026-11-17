import { useEffect, useState } from 'react'
import './App.css'
import ClassicView from './views/ClassicView'

function App() {
  // Null while checking or when the backend is fine; an error message if it can't be reached.
  const [backendProblem, setBackendProblem] = useState<string | null>(null)

  // Runs once when the page loads: ask the backend if it's alive.
  useEffect(() => {
    fetch('/api/health')
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
      })
      .catch((error: Error) => setBackendProblem(error.message))
  }, [])

  return (
    <>
      {backendProblem && (
        <p className="backend-banner" role="alert">
          The backend can't be reached ({backendProblem}). Is it running on port 8000?
        </p>
      )}
      <ClassicView />
    </>
  )
}

export default App
