import { useEffect, useState } from 'react'
import './RepositoryHistory.css'

const PAGE_SIZE = 25

export default function RepositoryHistory({ repositoryUrl }) {
  const [filters, setFilters] = useState({ q: '', type: '', status: '' })
  const [offset, setOffset] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setResult(null)
    setError('')
    const query = new URLSearchParams({ ...filters, limit: String(PAGE_SIZE), offset: String(offset) })
    fetch(`${repositoryUrl}/history?${query}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Could not load history.')
        if (!Array.isArray(data.events) || !Number.isInteger(data.total)) {
          throw new Error('The history service returned an invalid response.')
        }
        if (!controller.signal.aborted) setResult(data)
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(failure.message || 'Could not load history.')
      })
    return () => controller.abort()
  }, [repositoryUrl, filters, offset, attempt])

  function changeFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }))
    setOffset(0)
  }

  return (
    <section className="repository-history" aria-label="Merge and commit history">
      <h3>Merge and commit history</h3>
      <p>Saved snapshots, finalized merges, and repository merge previews. Previews do not change branches.</p>
      <div className="history-filters">
        <label>Search history
          <input type="search" maxLength={200} value={filters.q}
            onChange={(event) => changeFilter('q', event.target.value)} />
        </label>
        <label>History type
          <select value={filters.type} onChange={(event) => changeFilter('type', event.target.value)}>
            <option value="">All types</option>
            <option value="commit">Commits</option>
            <option value="merge">Finalized merges</option>
            <option value="simulation">Simulations</option>
          </select>
        </label>
        <label>History status
          <select value={filters.status} onChange={(event) => changeFilter('status', event.target.value)}>
            <option value="">All statuses</option>
            <option value="success">Success</option>
            <option value="conflicts">Conflicts</option>
          </select>
        </label>
        <button type="button" onClick={() => { setOffset(0); setAttempt((value) => value + 1) }}>Refresh history</button>
      </div>
      {error ? <div role="alert">{error}
        <button type="button" onClick={() => setAttempt((value) => value + 1)}>Retry history</button>
      </div> : !result ? <p role="status">Loading history…</p> : (
        <>
          <p role="status">{result.total} history events</p>
          {result.events.length === 0 ? <p>No history matches these filters.</p> : (
            <ol className="history-events">
              {result.events.map((event) => <HistoryEntry key={event.id} event={event} repositoryUrl={repositoryUrl} />)}
            </ol>
          )}
          <nav aria-label="History pages">
            <button type="button" disabled={offset === 0} onClick={() => setOffset(offset - PAGE_SIZE)}>Previous history page</button>
            <span>Page {Math.floor(offset / PAGE_SIZE) + 1}</span>
            <button type="button" disabled={offset + PAGE_SIZE >= result.total}
              onClick={() => setOffset(offset + PAGE_SIZE)}>Next history page</button>
          </nav>
        </>
      )}
    </section>
  )
}

function HistoryEntry({ event, repositoryUrl }) {
  const [snapshot, setSnapshot] = useState(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    setSnapshot(null)
    setError('')
  }, [repositoryUrl, event.id])

  async function loadSnapshot() {
    setPending(true)
    setError('')
    try {
      const response = await fetch(`${repositoryUrl}/history/${encodeURIComponent(event.id)}`)
      const data = await response.json()
      if (!response.ok || typeof data.event?.code !== 'string') {
        throw new Error(data?.error || 'Could not load the saved snapshot.')
      }
      setSnapshot(data.event.code)
    } catch (failure) { setError(failure.message) }
    finally { setPending(false) }
  }

  return (
    <li>
      <h4>{event.message}</h4>
      <p>{event.type} · {event.status} · {event.actorName}</p>
      <time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString()}</time>
      <p>Branch: {event.branchName}</p>
      <code>{event.id}</code>
      {event.sourceName && <p>Source: {event.sourceName}</p>}
      {event.parentCommitId && <p>Parent: <code>{event.parentCommitId}</code></p>}
      {event.mergeParentCommitId && <p>Merge parent: <code>{event.mergeParentCommitId}</code></p>}
      {event.type === 'simulation' ? <p>{event.conflictCount} conflicts</p> : (
        <button type="button" disabled={pending} onClick={loadSnapshot}>
          {pending ? 'Loading snapshot…' : `View snapshot ${event.id}`}
        </button>
      )}
      {error && <p role="alert">{error}</p>}
      {snapshot !== null && <details open><summary>Saved code snapshot</summary><pre>{snapshot}</pre></details>}
    </li>
  )
}
