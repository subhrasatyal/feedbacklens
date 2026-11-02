// All calls to the backend's /api/investigations endpoints.
// The types here mirror backend/app/schemas/investigation.py.

// The problem or decision, as the PM fills it in.
export type InvestigationInput = {
  question: string
  requested_by: string
  decision_deadline: string // a date as "YYYY-MM-DD"
  what_would_change: string | null
}

export type Investigation = InvestigationInput & {
  id: string
  created_at: string
  updated_at: string
}

export type EvidenceType = 'interview' | 'support_ticket' | 'metric' | 'document' | 'other'

// A saved piece of evidence in the specimen tray.
export type Evidence = {
  id: string
  investigation_id: string
  source_label: string // citation label, e.g. "INT-01"
  source_type: EvidenceType
  source_type_other: string | null
  title: string
  content: string
  created_at: string
}

// One investigation together with its evidence.
export type InvestigationDetail = Investigation & {
  evidence: Evidence[]
}

// All investigations, most recently changed first.
export async function listInvestigations(): Promise<Investigation[]> {
  const response = await fetch('/api/investigations')
  await throwIfFailed(response)
  return response.json()
}

export async function getInvestigation(id: string): Promise<InvestigationDetail> {
  const response = await fetch(`/api/investigations/${id}`)
  await throwIfFailed(response)
  return response.json()
}

export async function createInvestigation(input: InvestigationInput): Promise<Investigation> {
  const response = await fetch('/api/investigations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  await throwIfFailed(response)
  return response.json()
}

export async function updateInvestigation(
  id: string,
  input: InvestigationInput,
): Promise<Investigation> {
  const response = await fetch(`/api/investigations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  await throwIfFailed(response)
  return response.json()
}

// If the backend said no, turn its reply into an Error with a readable message.
async function throwIfFailed(response: Response) {
  if (response.ok) return

  // FastAPI puts the reason in "detail": a plain string for errors we raise
  // ourselves (e.g. "Investigation not found"), or a list for invalid input.
  const body = await response.json().catch(() => ({}))
  let message = `Request failed (HTTP ${response.status})`
  if (typeof body.detail === 'string') {
    message = body.detail
  } else if (Array.isArray(body.detail) && body.detail[0]?.msg) {
    message = body.detail[0].msg
  }
  throw new Error(message)
}
