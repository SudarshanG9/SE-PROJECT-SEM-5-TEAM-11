import { useState } from 'react'
import MergeInstructions from './MergeInstructions'
import './App.css'

const API_URL = '/api/merge'

function App() {
  const [view, setView] = useState('simulator')
  const [base, setBase] = useState('')
  const [branchA, setBranchA] = useState('')
  const [branchB, setBranchB] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleMerge() {
    setError(null)
    setResult(null)
    setLoading(true)

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base, branchA, branchB }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || `Server error: ${response.status}`)
        return
      }

      setResult(data)
    } catch (err) {
      setError('Could not reach the backend. Make sure the server is running on port 3000.')
    } finally {
      setLoading(false)
    }
  }

  function handleClear() {
    setBase('')
    setBranchA('')
    setBranchB('')
    setResult(null)
    setError(null)
  }

  return (
    <main className="app">
      <header className="page-header">
        <p className="eyebrow">DEVELOPER TOOL</p>
        <h1>Three-Way Merge Simulator</h1>
        <p className="subtitle">
          Compare your base code with two branches and simulate a merge.
        </p>
      </header>

      <nav className="view-navigation" aria-label="Main navigation">
        <button
          type="button"
          aria-current={view === 'simulator' ? 'page' : undefined}
          onClick={() => setView('simulator')}
        >
          Merge Simulator
        </button>
        <button
          type="button"
          aria-current={view === 'guide' ? 'page' : undefined}
          onClick={() => setView('guide')}
        >
          User Guide
        </button>
      </nav>

      {view === 'guide' && <MergeInstructions />}
      <div hidden={view !== 'simulator'}>
      <section className="editor-grid">
        <div className="editor-card">
          <label htmlFor="base">Base</label>
          <p className="editor-description">The original version</p>
          <textarea
            id="base"
            value={base}
            onChange={(e) => setBase(e.target.value)}
            placeholder="Enter base code here..."
            spellCheck="false"
          />
        </div>

        <div className="editor-card">
          <label htmlFor="branch-a">Branch A</label>
          <p className="editor-description">First set of changes</p>
          <textarea
            id="branch-a"
            value={branchA}
            onChange={(e) => setBranchA(e.target.value)}
            placeholder="Enter Branch A code here..."
            spellCheck="false"
          />
        </div>

        <div className="editor-card">
          <label htmlFor="branch-b">Branch B</label>
          <p className="editor-description">Second set of changes</p>
          <textarea
            id="branch-b"
            value={branchB}
            onChange={(e) => setBranchB(e.target.value)}
            placeholder="Enter Branch B code here..."
            spellCheck="false"
          />
        </div>
      </section>

      <div className="actions">
        <button type="button" onClick={handleMerge} disabled={loading}>
          {loading ? 'Merging…' : 'Simulate Merge'}
        </button>

        <button
          type="button"
          className="clear-button"
          onClick={handleClear}
          disabled={loading}
        >
          Clear All
        </button>
      </div>

      {error && (
        <div className="error-banner" role="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <section className="result-card" aria-live="polite">
          <div className="result-header">
            <h2>Merge Result</h2>
            <span className={`status-badge ${result.hasConflict ? 'conflict' : 'success'}`}>
              {result.hasConflict
                ? `⚠ ${result.conflicts.length} conflict${result.conflicts.length !== 1 ? 's' : ''} detected`
                : '✓ Merged successfully'}
            </span>
          </div>

          <p className="result-message">{result.message}</p>

          <h3 className="section-label">Merged Code</h3>
          <pre className="code-block">{result.mergedCode}</pre>

          {result.hasConflict && result.conflicts.length > 0 && (
            <div className="conflicts-section">
              <h3 className="section-label">
                Conflict Details ({result.conflicts.length})
              </h3>
              {result.conflicts.map((conflict) => (
                <div key={conflict.id} className="conflict-block">
                  <p className="conflict-meta">
                    Conflict #{conflict.id} — lines {conflict.startLine}–{conflict.endLine}
                  </p>
                  <div className="conflict-sides">
                    <div className="conflict-side side-a">
                      <p className="side-label">Branch A</p>
                      <pre>{conflict.branchA}</pre>
                    </div>
                    <div className="conflict-side side-b">
                      <p className="side-label">Branch B</p>
                      <pre>{conflict.branchB}</pre>
                    </div>
                  </div>
                  {conflict.base && (
                    <details className="conflict-base">
                      <summary>Base (common ancestor)</summary>
                      <pre>{conflict.base}</pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
      </div>
    </main>
  )
}

export default App