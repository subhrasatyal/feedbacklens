// The framework library. Mirrors backend/app/schemas/planning.py.

// An extra question a framework asks the PM before it's applied.
export type FrameworkQuestion = {
  id: string
  question: string
  help: string
  agent_can_suggest: boolean
  required: boolean
}

export type Framework = {
  id: string
  name: string
  what: string
  use_when: string
  avoid_when: string
  questions_answered: string[]
  required_inputs: string[]
  procedure: string[]
  expected_outputs: string[]
  failure_modes: string[]
  pm_inputs: FrameworkQuestion[]
}

export async function listFrameworks(): Promise<Framework[]> {
  const response = await fetch('/api/frameworks')
  if (!response.ok) throw new Error(`Couldn't load frameworks (HTTP ${response.status})`)
  return response.json()
}
