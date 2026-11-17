// Choices and helpers shared by the specimen tray's upload, paste and table.
import type { Evidence, EvidenceCreate, EvidenceType } from '../../api/investigations'

// Must match MAX_EVIDENCE_CHARS in backend/app/schemas/investigation.py.
export const MAX_EVIDENCE_CHARS = 200_000

// Source: where the evidence came from. "Other" (with a typed name) is added by SelectWithOther.
export const SOURCE_OPTIONS = [
  'Customer',
  'Sales',
  'Support team',
  'Customer success',
  'Analytics',
  'Leadership',
].map((name) => ({ value: name, label: name }))

// Type: what kind of evidence it is. "Other" is added by SelectWithOther.
const TYPE_LABELS: Record<Exclude<EvidenceType, 'other'>, string> = {
  interview: 'Interview notes',
  support_ticket: 'Support ticket',
  metric: 'Metrics',
  document: 'Document',
}

export const TYPE_OPTIONS = Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))

// A dropdown answer: the option picked, plus the typed name when it's "other".
export type Choice = { choice: string; other: string }

export const EMPTY_CHOICE: Choice = { choice: '', other: '' }

// True once an option is picked (and named, if it's "other").
export function isChoiceComplete({ choice, other }: Choice): boolean {
  return choice !== '' && (choice !== 'other' || other.trim() !== '')
}

// Turn the upload form's answers into what the backend expects.
export function toEvidenceCreate(
  title: string,
  content: string,
  source: Choice,
  type: Choice,
): EvidenceCreate {
  return {
    title,
    content,
    origin: source.choice === 'other' ? source.other.trim() : source.choice,
    source_type: type.choice as EvidenceType,
    source_type_other: type.choice === 'other' ? type.other.trim() : null,
  }
}

// How a saved piece of evidence's type is written in the table.
export function typeLabel(item: Evidence): string {
  if (item.source_type === 'other') return item.source_type_other ?? 'Other'
  return TYPE_LABELS[item.source_type]
}
