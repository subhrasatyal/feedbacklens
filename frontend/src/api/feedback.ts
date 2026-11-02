// All calls to the backend's /api/feedback endpoints.
// The types here mirror backend/app/schemas/feedback.py.

export type SourceType = 'interview' | 'support_ticket' | 'metric' | 'document'

// What we send when adding feedback.
export type FeedbackCreate = {
  source_type: SourceType
  source_label: string
  title: string
  content: string
  customer_name?: string
  customer_segment?: string
  occurred_at?: string
}

// What the backend sends back: everything above plus fields it fills in.
export type Feedback = FeedbackCreate & {
  id: string
  created_at: string
  is_sample: boolean
  theme: string | null
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed' | null
  urgency: 'low' | 'medium' | 'high' | 'critical' | null
  analyzed_at: string | null
}

export async function createFeedback(item: FeedbackCreate): Promise<Feedback> {
  const response = await fetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  })

  if (!response.ok) {
    // FastAPI puts the reason in "detail". It's a plain string for errors we
    // raise ourselves (e.g. a duplicate label), and a list for invalid input.
    const body = await response.json().catch(() => ({}))
    const message =
      typeof body.detail === 'string' ? body.detail : `Request failed (HTTP ${response.status})`
    throw new Error(message)
  }

  return response.json()
}
