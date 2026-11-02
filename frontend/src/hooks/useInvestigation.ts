import { useCallback, useEffect, useState } from 'react'
import {
  addEvidence as addEvidenceRequest,
  createInvestigation,
  deleteEvidence,
  getInvestigation,
  listInvestigations,
  updateInvestigation,
  type EvidenceCreate,
  type Investigation,
  type InvestigationDetail,
  type InvestigationInput,
} from '../api/investigations'

// The open investigation's id is kept in the page address (?id=...), so a
// refresh or a copied link reopens the same investigation.
function readIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('id')
}

function writeIdToUrl(id: string | null) {
  const url = new URL(window.location.href)
  if (id) url.searchParams.set('id', id)
  else url.searchParams.delete('id')
  window.history.replaceState(null, '', url)
}

// Shared memory for an investigation: the one that's open (with its evidence),
// the list of recent ones, and actions to change them. Both the plain view and
// the future lab view use this same hook, so they always show the same data.
export function useInvestigation() {
  const [investigation, setInvestigation] = useState<InvestigationDetail | null>(null)
  // Only "loading" at first if the address names an investigation to open.
  const [loading, setLoading] = useState(() => readIdFromUrl() !== null)
  const [error, setError] = useState<string | null>(null)
  const [recent, setRecent] = useState<Investigation[]>([])

  // Fetch one investigation. State only changes once the reply arrives.
  const load = useCallback((id: string) => {
    return getInvestigation(id)
      .then((data) => {
        setInvestigation(data)
        setError(null)
      })
      .catch((err: Error) => {
        setInvestigation(null)
        setError(`Couldn't open that investigation: ${err.message}`)
        writeIdToUrl(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const refreshRecent = useCallback(() => {
    return listInvestigations()
      .then(setRecent)
      .catch((err: Error) => setError(`Couldn't load recent investigations: ${err.message}`))
  }, [])

  // When the page opens: reopen the investigation in the address, if any,
  // and load the recent list.
  useEffect(() => {
    const id = readIdFromUrl()
    if (id) load(id)
    refreshRecent()
  }, [load, refreshRecent])

  // Open a different investigation, e.g. from the recent list.
  function open(id: string) {
    setLoading(true)
    setError(null)
    writeIdToUrl(id)
    load(id)
  }

  // Close the current investigation so the form is empty for a new one.
  function startNew() {
    setInvestigation(null)
    setError(null)
    writeIdToUrl(null)
  }

  // Save the problem: creates the investigation the first time, edits it after.
  // Errors are passed back to the form, which shows them next to its button.
  async function saveProblem(input: InvestigationInput) {
    if (investigation === null) {
      const created = await createInvestigation(input)
      setInvestigation({ ...created, evidence: [] })
      writeIdToUrl(created.id)
    } else {
      const updated = await updateInvestigation(investigation.id, input)
      setInvestigation({ ...updated, evidence: investigation.evidence })
    }
    refreshRecent()
  }

  // Add evidence to the open investigation's specimen tray. Errors go back to the caller.
  async function addEvidence(items: EvidenceCreate[]) {
    if (investigation === null) return
    const saved = await addEvidenceRequest(investigation.id, items)
    setInvestigation({ ...investigation, evidence: [...investigation.evidence, ...saved] })
    refreshRecent()
  }

  // Remove one or more pieces of evidence. Afterwards the tray is reloaded from
  // the backend, so it shows exactly what was removed even if one removal failed.
  async function removeEvidence(evidenceIds: string[]) {
    if (investigation === null) return
    const id = investigation.id
    try {
      await Promise.all(evidenceIds.map((evidenceId) => deleteEvidence(id, evidenceId)))
    } finally {
      await load(id)
      refreshRecent()
    }
  }

  return {
    investigation,
    loading,
    error,
    recent,
    open,
    startNew,
    saveProblem,
    addEvidence,
    removeEvidence,
  }
}
