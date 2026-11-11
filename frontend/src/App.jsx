import { useState } from 'react'
import CodeVersionInput from './CodeVersionInput'
import './App.css'

const API_URL = '/api/merge'

function App() {
  const [codeVersions, setCodeVersions] = useState({
    base: '',
    branchA: '',
    branchB: '',
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function updateCodeVersion(version, value) {
    setCodeVersions((currentVersions) => ({
      ...currentVersions,
      [version]: value,
    }))
  }

  async function handleMerge() {
    setError(null)
    setResult(null)
    setLoading(true)

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(codeVersions),
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
    setCodeVersions({ base: '', branchA: '', branchB: '' })
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

      <section aria-labelledby="code-versions-heading">
        <h2 className="editor-section-title" id="code-versions-heading">
          Enter Code Versions
        </h2>
        <div className="editor-grid">
          <CodeVersionInput
            id="base"
            label="Base Version"
            description="The original source code before branching."
            value={codeVersions.base}
            onChange={(value) => updateCodeVersion('base', value)}
            placeholder="Enter base code here..."
          />
          <CodeVersionInput
            id="branch-a"
            label="Branch A Version"
            description="Contains the first branch's modifications."
            value={codeVersions.branchA}
            onChange={(value) => updateCodeVersion('branchA', value)}
            placeholder="Enter Branch A code here..."
          />
          <CodeVersionInput
            id="branch-b"
            label="Branch B Version"
            description="Contains the second branch's modifications."
            value={codeVersions.branchB}
            onChange={(value) => updateCodeVersion('branchB', value)}
            placeholder="Enter Branch B code here..."
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
    </main>
  )
}

export default App