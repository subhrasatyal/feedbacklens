// The stations of an investigation, in order. The wireframe's separate Hypothesis
// board was cut for the MVP: the hypothesis is a card at the end of the Planning station.
// `built` is false until a station exists, so the step bar can't open it.
export const STATIONS = [
  { id: 'clipboard', title: 'Clipboard', sub: 'Problem & evidence', built: true },
  { id: 'planning', title: 'Planning station', sub: 'Approach & hypothesis', built: true },
  { id: 'investigation', title: 'Investigation', sub: 'Run approved tests', built: false },
  { id: 'results', title: 'Results chamber', sub: 'Decision brief', built: false },
] as const

export type StationId = (typeof STATIONS)[number]['id']

// The agent's investigation loop from the PRD, shown in the side panel.
export const LOOP_STEPS = [
  'Diagnose',
  'Recommend framework',
  'Form hypothesis',
  'Identify evidence gaps',
  'Propose investigation',
  'Request approval',
  'Execute tools',
  'Reassess',
  'Recommend next step',
] as const
