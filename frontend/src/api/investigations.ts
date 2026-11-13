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

// The agent's framework recommendation (mode B). Mirrors Recommendation in
// backend/app/schemas/planning.py. Evidence, interpretation, assumptions and
// gaps are kept in separate fields.
export type EvidencePoint = { statement: string; evidence_refs: string[] }

export type Recommendation = {
  evidence_found: EvidencePoint[]
  contradictions: EvidencePoint[]
  diagnosis: string
  framework_id: string
  why_fits: string
  will_uncover: string[]
  assumptions: string[]
  context_gaps: string[]
  confidence: 'low' | 'medium' | 'high'
  confidence_reason: string
  runner_up_id: string
  why_not: { framework_id: string; reason: string }[]
  suggested_answers: { question_id: string; answer: string; evidence_refs: string[] }[]
  model: string
  sources_read: string[] // labels of the checked evidence the agent was given
  created_at: string
}

// The hypothesis card at the Planning station. Mirrors backend/app/schemas/hypothesis.py.
export type Hypothesis = {
  statement: string // the belief to test
  challenge_if: string // evidence that would show it's wrong
  based_on: string[] // labels of the evidence the draft rests on (not test results)
  rationale: string | null // the agent's "why this one"; null if the PM wrote it
  status: 'draft' | 'accepted'
  written_by: 'agent' | 'pm' // "pm" once the PM has written or edited it
  framework_id: string | null // the framework saved when it was made
  version: number // counts every hypothesis in the investigation, rejected ones too
  created_at: string
  updated_at: string
}

export type RejectedHypothesis = Hypothesis & { reason: string; rejected_at: string }

// What the PM sends to write or edit the hypothesis.
export type HypothesisEdit = { statement: string; challenge_if: string }

export type Investigation = InvestigationInput & {
  id: string
  // Empty until an approach is saved at the Planning station.
  mode: Mode | null
  framework_id: string | null
  framework_inputs: Record<string, string>
  recommendation: Recommendation | null // the agent's latest recommendation, if asked for
  hypothesis: Hypothesis | null // empty until one is drafted or written
  rejected_hypotheses: RejectedHypothesis[] // oldest first
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

// Ask the agent to read the checked evidence and recommend a framework.
// One Claude call: usually 30-60 seconds.
export async function requestRecommendation(id: string): Promise<Recommendation> {
  const response = await fetch(`/api/investigations/${id}/recommendation`, { method: 'POST' })
  await throwIfFailed(response)
  return response.json()
}

// Ask the agent to draft a hypothesis from the saved approach and the checked evidence.
// One Claude call: usually under a minute. Returns the updated investigation.
export async function draftHypothesis(id: string): Promise<Investigation> {
  const response = await fetch(`/api/investigations/${id}/hypothesis/draft`, { method: 'POST' })
  await throwIfFailed(response)
  return response.json()
}

// Write a hypothesis, or edit the current one (any edit makes it a draft again).
export async function saveHypothesis(id: string, input: HypothesisEdit): Promise<Investigation> {
  const response = await fetch(`/api/investigations/${id}/hypothesis`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  await throwIfFailed(response)
  return response.json()
}

export async function acceptHypothesis(id: string): Promise<Investigation> {
  const response = await fetch(`/api/investigations/${id}/hypothesis/accept`, { method: 'POST' })
  await throwIfFailed(response)
  return response.json()
}

// Move the current hypothesis to the rejected list, with the PM's reason.
export async function rejectHypothesis(id: string, reason: string): Promise<Investigation> {
  const response = await fetch(`/api/investigations/${id}/hypothesis/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
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
