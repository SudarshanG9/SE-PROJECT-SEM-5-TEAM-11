
import { useState } from 'react'
import './App.css'

function App() {
  const [base, setBase] = useState('')
  const [branchA, setBranchA] = useState('')
  const [branchB, setBranchB] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const editors = [
    {
      id: 'base',
      number: '01',
      title: 'Base Version',
      description: 'The original source code',
      placeholder: '// Paste your original code here...',
      fileName: 'base.txt',
      value: base,
      setter: setBase,
    },
    {
      id: 'branch-a',
      number: '02',
      title: 'Branch A',
      description: 'First set of changes',
      placeholder: '// Paste the first branch changes...',
      fileName: 'branch-a.txt',
      value: branchA,
      setter: setBranchA,
    },
    {
      id: 'branch-b',
      number: '03',
      title: 'Branch B',
      description: 'Second set of changes',
      placeholder: '// Paste the second branch changes...',
      fileName: 'branch-b.txt',
      value: branchB,
      setter: setBranchB,
    },
  ]

  async function handleMerge() {
    setError('')
    setResult(null)

    if (!base.trim() || !branchA.trim() || !branchB.trim()) {
      setError(
        'Please fill in all three fields: Base, Branch A, and Branch B.'
      )
      return
    }

    setLoading(true)

    try {
      const response = await fetch('http://localhost:3000/api/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base, branchA, branchB }),
      })
      const mergeResult = await response.json()
      if (!response.ok) {
        throw new Error(mergeResult.error || 'Unable to simulate the merge. Please try again.')
      }
      setResult(mergeResult)
    } catch (requestError) {
      setError(requestError.message || 'Unable to reach the merge service. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleClear() {
    setBase('')
    setBranchA('')
    setBranchB('')
    setResult(null)
    setError('')
    setLoading(false)
  }

  return (
    <main className="app">
      <header className="page-header">
        <a className="brand" href="#top" aria-label="MergeLab home" id="top">
          <span className="brand-icon" aria-hidden="true">
            {'{ }'}
          </span>
          <span>MergeLab</span>
          <span className="brand-tag">DEV TOOLS</span>
        </a>

        <div className="hero-content">
          <div className="eyebrow">
            <span className="status-dot" />
            VERSION CONTROL WORKSPACE
          </div>

          <h1>
            Three-Way Merge
            <span className="title-accent"> Simulator.</span>
          </h1>

          <p className="subtitle">
            Compare your original code with two branches.
            Explore your changes in one focused workspace.
          </p>
        </div>

        <div className="workspace-meta">
          <span className="meta-item">
            <span className="meta-dot" />
            Local workspace
          </span>
          <span className="meta-divider" />
          <span className="meta-item">3 input files</span>
        </div>
      </header>

      <section className="workspace" aria-label="Merge workspace">
        <div className="section-heading">
          <div>
            <p className="section-kicker">01 / INPUT</p>
            <h2>Compare your versions</h2>
            <p className="section-description">
              Add the base version and both modified branches to get started.
            </p>
          </div>

          <span className="input-count">03 EDITORS</span>
        </div>

        <div className="editor-grid">
          {editors.map((editor) => {
            const invalid = Boolean(error && !editor.value.trim())

            return (
              <section
                className={`editor-card${invalid ? ' is-invalid' : ''}`}
                key={editor.id}
              >
                <div className="editor-card-header">
                  <div className="editor-heading">
                    <span className="editor-number">{editor.number}</span>
                    <div>
                      <label htmlFor={editor.id}>{editor.title}</label>
                      <p className="editor-description">
                        {editor.description}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`editor-status${editor.value.trim() ? ' is-filled' : ''}`}
                  >
                    <span className="status-dot" />
                    {editor.value.trim() ? 'Ready' : 'Empty'}
                  </span>
                </div>

                <div className="editor-toolbar">
                  <div className="window-dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>

                  <span className="file-name">{editor.fileName}</span>
                  <span className="language-label">TEXT</span>
                </div>

                <div className="editor-body">
                  <div className="line-number" aria-hidden="true">
                    1
                  </div>

                  <textarea
                    id={editor.id}
                    aria-label={editor.id === 'base' ? 'Base' : editor.title}
                    value={editor.value}
                    onChange={(event) => {
                      editor.setter(event.target.value)
                      setError('')
                    }}
                    placeholder={editor.placeholder}
                    spellCheck="false"
                    autoCapitalize="off"
                    autoComplete="off"
                    autoCorrect="off"
                    aria-invalid={invalid}
                    aria-describedby={
                      invalid ? `${editor.id}-error` : undefined
                    }
                  />
                </div>

                {invalid && (
                  <p className="field-error" id={`${editor.id}-error`}>
                    This field is required.
                  </p>
                )}

                <div className="editor-footer">
                  <span>{editor.value.split('\n').length} lines</span>
                  <span>{editor.value.length} characters</span>
                </div>
              </section>
            )
          })}
        </div>

        {error && (
          <div className="error-message" role="alert">
            <span className="error-icon" aria-hidden="true">
              !
            </span>
            <div>
              <strong>Unable to simulate merge</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        <div className="actions">
          <button
            type="button"
            className="merge-button"
            onClick={handleMerge}
            disabled={loading}
          >
            <span>{loading ? 'Processing...' : 'Simulate Merge'}</span>
            {!loading && (
              <span className="button-arrow" aria-hidden="true">
                →
              </span>
            )}
          </button>

          <button
            type="button"
            className="clear-button"
            onClick={handleClear}
            disabled={loading}
          >
            <span aria-hidden="true">↺</span>
            Clear workspace
          </button>

          <p className="action-hint">All three inputs are required</p>
        </div>
      </section>

      <section className="result-section" aria-live="polite">
        <div className="section-heading">
          <div>
            <p className="section-kicker">02 / OUTPUT</p>
            <h2>Merge output</h2>
            <p className="section-description">
              Your simulated result will appear here.
            </p>
          </div>

          <span className={`result-badge${result ? ' has-result' : ''}`}>
            <span className="status-dot" />
            {result ? 'Preview available' : 'Awaiting input'}
          </span>
        </div>

        {result ? (
          <div className="result-card">
            <div className="result-card-header">
              <div className="result-title">
                <span className="result-icon" aria-hidden="true">
                  {'{ }'}
                </span>
                <div>
                  <h3>Merged output</h3>
                  <p>Generated from the three provided inputs</p>
                </div>
              </div>

              <span className="preview-label">{result.hasConflict ? 'CONFLICT' : 'MERGED'}</span>
            </div>

            <div className="result-note">
              <h3>Merge status</h3>
              <p>{result.hasConflict ? 'Conflicts require attention' : 'Successful merge'}</p>
              <p>{result.message}</p>
            </div>
            <pre className="result-output">{result.mergedCode}</pre>
            {result.conflicts?.length > 0 && (
              <section className="result-note" aria-label="Conflict details">
                <h3>Conflict details</h3>
                {result.conflicts.map((conflict) => (
                  <article key={conflict.id}>
                    <h4>Conflict {conflict.id}: Line {conflict.startLine}{conflict.endLine > conflict.startLine ? `–${conflict.endLine}` : ''}</h4>
                    <p>Base</p>
                    <pre className="result-output">{conflict.base}</pre>
                    <p>Branch A</p>
                    <pre className="result-output">{conflict.branchA}</pre>
                    <p>Branch B</p>
                    <pre className="result-output">{conflict.branchB}</pre>
                  </article>
                ))}
              </section>
            )}
          </div>
        ) : (
          <div className="empty-result">
            <div className="empty-result-icon" aria-hidden="true">
              {'{ }'}
            </div>
            <h3>No output yet</h3>
            <p>
              Fill in all three editors and select{' '}
              <strong>Simulate Merge</strong> to generate a preview.
            </p>
          </div>
        )}
      </section>

      <footer className="page-footer">
        <span>
          MERGELAB <span className="footer-separator">/</span> DEVELOPER
          WORKSPACE
        </span>
        <span>Built for clearer code comparisons.</span>
      </footer>
    </main>
  )
}

export default App
