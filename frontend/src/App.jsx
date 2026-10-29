import { useEffect, useState } from 'react'
import './App.css'

function App() {
  // "checking..." until the backend answers, then "ok" or an error message.
  const [backendStatus, setBackendStatus] = useState('checking...')

  // Runs once when the page loads: ask the backend if it's alive.
  useEffect(() => {
    fetch('/api/health')
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
      })
      .then((data) => setBackendStatus(data.status))
      .catch((error) => setBackendStatus(`unreachable (${error.message})`))
  }, [])

  return (
    <main>
      <h1>The Product Lab</h1>
      <p>Backend: {backendStatus}</p>
    </main>
  )
}

export default App
