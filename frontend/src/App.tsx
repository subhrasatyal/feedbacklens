import { useEffect, useState } from 'react'
import './App.css'
import FeedbackForm from './components/shared/FeedbackForm'
import FeedbackList from './components/shared/FeedbackList'
import { useFeedback } from './hooks/useFeedback'

function App() {
  // "checking..." until the backend answers, then "ok" or an error message.
  const [backendStatus, setBackendStatus] = useState<string>('checking...')
  // The feedback list, shared by everything on the page.
  const feedback = useFeedback()

  // Runs once when the page loads: ask the backend if it's alive.
  useEffect(() => {
    fetch('/api/health')
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
      })
      .then((data: { status: string }) => setBackendStatus(data.status))
      .catch((error: Error) => setBackendStatus(`unreachable (${error.message})`))
  }, [])

  return (
    <main>
      <h1>The Product Lab</h1>
      <p>Backend: {backendStatus}</p>
      <FeedbackForm onSaved={feedback.refresh} />
      <FeedbackList items={feedback.items} loading={feedback.loading} error={feedback.error} />
    </main>
  )
}

export default App
