import { useCallback, useEffect, useState } from 'react'
import {
  addEvidence as addEvidenceRequest,
  createInvestigation,
  deleteEvidence,
  getInvestigation,
  listInvestigations,
  setEvidenceUse as setEvidenceUseRequest,
  updateInvestigation,
  type EvidenceCreate,
  type Investigation,
  type InvestigationDetail,
  type InvestigationInput,
} from '../api/investigations'
import { STATIONS, type StationId } from '../components/shared/stations'

// The open investigation and station are kept in the page address
// (?id=...&station=...), so a refresh or a copied link opens the same place.
function readUrl(): { id: string | null; station: StationId } {
  const params = new URLSearchParams(window.location.search)
  const station = STATIONS.find((s) => s.id === params.get('station') && s.built)
  return { id: params.get('id'), station: station?.id ?? 'clipboard' }
}

function writeUrl(id: string | null, station: StationId) {
  const url = new URL(window.location.href)
  if (id) url.searchParams.set('id', id)
  else url.searchParams.delete('id')
  if (station !== 'clipboard') url.searchParams.set('station', station)
  else url.searchParams.delete('station')
  window.history.replaceState(null, '', url)
}

// Shared memory for an investigation: the one that's open (with its evidence),
// which station is showing, the list of recent ones, and actions to change them.
// Both the plain view and the future lab view use this same hook.
export function useInvestigation() {
  const [investigation, setInvestigation] = useState<InvestigationDetail | null>(null)
  const [station, setStation] = useState<StationId>(() => readUrl().station)
  // Only "loading" at first if the address names an investigation to open.
  const [loading, setLoading] = useState(() => readUrl().id !== null)
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
        setStation('clipboard')
        setError(`Couldn't open that investigation: ${err.message}`)
        writeUrl(null, 'clipboard')
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
    const { id } = readUrl()
    if (id) load(id)
    refreshRecent()
  }, [load, refreshRecent])

  // Show a different station of the open investigation.
  function goToStation(next: StationId) {
    setStation(next)
    writeUrl(investigation?.id ?? null, next)
  }

  // Open a different investigation, e.g. from the resume list. Starts at the clipboard.
  function open(id: string) {
    setLoading(true)
    setError(null)
    setStation('clipboard')
    writeUrl(id, 'clipboard')
    load(id)
  }

  // Close the current investigation so the clipboard is empty for a new one.
  function startNew() {
    setInvestigation(null)
    setError(null)
    setStation('clipboard')
    writeUrl(null, 'clipboard')
  }

  // Save the problem: creates the investigation the first time, edits it after.
  // Errors are passed back to the form, which shows them next to its button.
  async function saveProblem(input: InvestigationInput) {
    if (investigation === null) {
      const created = await createInvestigation(input)
      setInvestigation({ ...created, evidence: [] })
      writeUrl(created.id, station)
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

  // Tick or untick Use. Errors go back to the caller.
  async function setEvidenceUse(evidenceId: string, useByAgent: boolean) {
    if (investigation === null) return
    const updated = await setEvidenceUseRequest(investigation.id, evidenceId, useByAgent)
    setInvestigation({
      ...investigation,
      evidence: investigation.evidence.map((item) => (item.id === evidenceId ? updated : item)),
    })
  }

  // Remove one piece of evidence. Afterwards the tray is reloaded from the
  // backend, so it shows the true state even if the removal failed.
  async function removeEvidence(evidenceId: string) {
    if (investigation === null) return
    const id = investigation.id
    try {
      await deleteEvidence(id, evidenceId)
    } finally {
      await load(id)
      refreshRecent()
    }
  }

  return {
    investigation,
    station,
    loading,
    error,
    recent,
    goToStation,
    open,
    startNew,
    saveProblem,
    addEvidence,
    setEvidenceUse,
    removeEvidence,
  }
}
