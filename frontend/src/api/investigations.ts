// All calls to the backend's /api/investigations endpoints.
// The types here mirror backend/app/schemas/investigation.py.

// The problem or decision, as the PM fills it in.
export type InvestigationInput = {
  question: string
  requested_by: string
  decision_deadline: string // a date as "YYYY-MM-DD"
  what_would_change: string | null
}

// Planning station: "I'll pick a framework" or "Recommend one for me".
export type Mode = 'pick' | 'recommend'

// The approach the PM saves at the Planning station.
export type ApproachInput = {
  mode: Mode
  framework_id: string
  framework_inputs: Record<string, string> // answers keyed by question id
}

export type Investigation = InvestigationInput & {
  id: string
  // Empty until an approach is saved at the Planning station.
  mode: Mode | null
  framework_id: string | null
  framework_inputs: Record<string, string>
  created_at: string
  updated_at: string
}

export type EvidenceType = 'interview' | 'support_ticket' | 'metric' | 'document' | 'other'

// A new piece of evidence to add. The backend assigns its label.
export type EvidenceCreate = {
  origin: string // where it came from, e.g. "Customer"
  source_type: EvidenceType
  source_type_other: string | null
  title: string
  content: string
}

// A saved piece of evidence in the specimen tray.
export type Evidence = {
  id: string
  investigation_id: string
  source_label: string // citation label, e.g. "INT-01"
  origin: string | null
  source_type: EvidenceType
  source_type_other: string | null
  title: string
  content: string
  use_by_agent: boolean // the tray's Use checkbox: may the agent read this?
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

export async function saveApproach(id: string, input: ApproachInput): Promise<Investigation> {
  const response = await fetch(`/api/investigations/${id}/approach`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  await throwIfFailed(response)
  return response.json()
}

// Add several pieces of evidence in one request. Returns them with their labels.
export async function addEvidence(
  investigationId: string,
  items: EvidenceCreate[],
): Promise<Evidence[]> {
  const response = await fetch(`/api/investigations/${investigationId}/evidence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(items),
  })
  await throwIfFailed(response)
  return response.json()
}

// Tick or untick Use for one piece of evidence.
export async function setEvidenceUse(
  investigationId: string,
  evidenceId: string,
  useByAgent: boolean,
): Promise<Evidence> {
  const response = await fetch(`/api/investigations/${investigationId}/evidence/${evidenceId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ use_by_agent: useByAgent }),
  })
  await throwIfFailed(response)
  return response.json()
}

export async function deleteEvidence(investigationId: string, evidenceId: string) {
  const response = await fetch(`/api/investigations/${investigationId}/evidence/${evidenceId}`, {
    method: 'DELETE',
  })
  await throwIfFailed(response)
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
