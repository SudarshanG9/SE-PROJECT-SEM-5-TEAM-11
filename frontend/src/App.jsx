
import { useRef, useState } from 'react'
import { compareLines, examples, resolveOutput } from './mergeWorkspace'
import './App.css'

function App() {
  const [base, setBase] = useState('')
  const [branchA, setBranchA] = useState('')
  const [branchB, setBranchB] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [allowEmpty, setAllowEmpty] = useState(false)
  const [comparisons, setComparisons] = useState(null)
  const [resolutions, setResolutions] = useState({})
  const [custom, setCustom] = useState({})
  const [feedback, setFeedback] = useState('')
  const revision = useRef(0)
  const pending = useRef(false)
  const unresolved = result ? result.conflicts.filter(c => !Object.hasOwn(resolutions, c.id)).length : 0
  const mergedCode = result ? resolveOutput(result, resolutions) : ''

  function invalidateResult() {
    revision.current++
    setResult(null)
    setResolutions({})
    setCustom({})
    setComparisons(null)
    setFeedback('')
    setError('')
  }

  function loadExample(name) {
    if ((base || branchA || branchB || result) && !window.confirm('Replace the current workspace with this example?')) return
    invalidateResult()
    setBase(examples[name].base)
    setBranchA(examples[name].branchA)
    setBranchB(examples[name].branchB)
  }

  async function handleCopy() {
    const currentRevision = revision.current
    try {
      await navigator.clipboard.writeText(mergedCode)
      if (currentRevision === revision.current) setFeedback('Merged code copied to clipboard.')
    } catch {
      if (currentRevision === revision.current) setFeedback('Unable to copy. Select the output or download the file instead.')
    }
  }

  function handleDownload() {
    const url = URL.createObjectURL(new Blob([mergedCode], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'merged-code.txt'
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 0)
    setFeedback('Merged code downloaded.')
  }

  function resolveConflict(conflict, lines) {
    revision.current++
    setResolutions(previous => ({ ...previous, [conflict.id]: lines }))
    setFeedback('')
  }

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
    if (pending.current) return
    invalidateResult()

    if (!allowEmpty && (!base.trim() || !branchA.trim() || !branchB.trim())) {
      setError(
        'Please fill in all three fields: Base, Branch A, and Branch B.'
      )
      return
    }

    setLoading(true)
    pending.current = true
    const currentRevision = revision.current

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base, branchA, branchB }),
      })
      let mergeResult
      try {
        mergeResult = await response.json()
      } catch {
        throw new Error('The merge service returned an invalid response. Check that the backend is running.')
      }
      if (!response.ok) {
        throw new Error(mergeResult?.error || 'Unable to simulate the merge. Please try again.')
      }
      if (typeof mergeResult?.mergedCode !== 'string' || typeof mergeResult.hasConflict !== 'boolean' ||
        typeof mergeResult.message !== 'string' || !Array.isArray(mergeResult.conflicts) || mergeResult.conflicts.some(c =>
        !c ||
        !Number.isInteger(c.outputStartLine) || !Number.isInteger(c.outputEndLine) ||
        c.outputStartLine < 1 || c.outputEndLine < c.outputStartLine ||
        !Array.isArray(c.branchALines) || !Array.isArray(c.branchBLines))) {
        throw new Error('The merge service returned an invalid result.')
      }
      if (currentRevision === revision.current) setResult(mergeResult)
    } catch (requestError) {
      if (currentRevision === revision.current) setError(requestError.message || 'Unable to reach the merge service. Please try again.')
    } finally {
      pending.current = false
      setLoading(false)
    }
  }

  function handleClear() {
    if ((base || branchA || branchB || result) && !window.confirm('Clear all inputs, results, and resolutions?')) return
    invalidateResult()
    setAllowEmpty(false)
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

        <details className="result-note">
          <summary>How to use MergeLab</summary>
          <p>Base is the common original file. Branch A and Branch B are independently edited versions. Compare versions to inspect changes, then simulate the merge.</p>
          <p>Added lines use +, removed lines use −; a modification appears as a removal and an addition. Independent edits are combined. Different overlapping edits remain conflicts until you choose a branch or apply custom text for every conflict.</p>
          <p>Empty files represent new files or deletions. Enable empty inputs explicitly when testing these cases. An empty custom resolution deletes that conflict section.</p>
          <div className="actions">
            <button className="clear-button" onClick={() => loadExample('clean')} disabled={loading}>Load non-conflicting example</button>
            <button className="clear-button" onClick={() => loadExample('conflict')} disabled={loading}>Load conflicting example</button>
          </div>
        </details>

        <div className="editor-grid">
          {editors.map((editor) => {
            const invalid = Boolean(error && !allowEmpty && !editor.value.trim())

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
                    disabled={loading}
                    onChange={(event) => {
                      editor.setter(event.target.value)
                      invalidateResult()
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

          <button className="clear-button" disabled={loading} onClick={() => setComparisons([
            { title: 'Base → Branch A', ...compareLines(base, branchA) },
            { title: 'Base → Branch B', ...compareLines(base, branchB) },
          ])}>Compare versions</button>
          <label className="action-hint"><input type="checkbox" checked={allowEmpty} disabled={loading} onChange={event => { setAllowEmpty(event.target.checked); invalidateResult() }} /> Allow empty file inputs</label>
        </div>
      </section>

      {comparisons && <section className="comparison-grid" aria-label="Version comparisons">
        {comparisons.map(comparison => <article className="result-card" key={comparison.title}>
          <h3>{comparison.title}</h3>
          <p>Base line / branch line · + added · − removed · modifications shown as removal + addition</p>
          {comparison.error ? <p role="alert">{comparison.error}</p> : <pre className="diff-output">{comparison.lines.length ? comparison.lines.map((line, index) => <span className={`diff-line ${line.kind}`} key={index}>{`${line.oldLine || '–'} / ${line.newLine || '–'}  ${line.kind === 'added' ? '+' : line.kind === 'removed' ? '−' : ' '} ${line.text}\n`}</span>) : 'Both files are empty.'}</pre>}
        </article>)}
      </section>}

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

              <span className="preview-label">{unresolved ? 'CONFLICT' : 'MERGED'}</span>
            </div>

            <div className="result-note">
              <h3>Merge status</h3>
              <p>{unresolved ? 'Conflicts require attention' : 'Successful merge'}</p>
              <p>{result.conflicts.length ? (unresolved ? `${unresolved} unresolved conflict(s)` : 'All conflicts resolved.') : result.message}</p>
            </div>
            <pre className="result-output" aria-label="Merged code">{mergedCode}</pre>
            <div className="actions">
              <button className="clear-button" onClick={handleCopy}>Copy merged code</button>
              <button className="clear-button" onClick={handleDownload}>Download merged code</button>
              {unresolved > 0 && <p className="action-hint">Exports include unresolved conflict markers.</p>}
              {feedback && <p role="status">{feedback}</p>}
            </div>
            {result.conflicts?.length > 0 && (
              <section className="result-note" aria-label="Conflict details">
                <h3>Conflict details</h3>
                {result.conflicts.map((conflict) => (
                  <article key={conflict.id} aria-label={`Conflict ${conflict.id}`}>
                    <h4>Conflict {conflict.id}: Line {conflict.startLine}{conflict.endLine > conflict.startLine ? `–${conflict.endLine}` : ''}</h4>
                    <p>Base</p>
                    <pre className="result-output">{conflict.base}</pre>
                    <p>Branch A</p>
                    <pre className="result-output">{conflict.branchA}</pre>
                    <p>Branch B</p>
                    <pre className="result-output">{conflict.branchB}</pre>
                    <p>{Object.hasOwn(resolutions, conflict.id) ? 'Resolved' : 'Unresolved'}</p>
                    <div className="actions">
                      <button className="clear-button" onClick={() => resolveConflict(conflict, conflict.branchALines)}>Use Branch A</button>
                      <button className="clear-button" onClick={() => resolveConflict(conflict, conflict.branchBLines)}>Use Branch B</button>
                    </div>
                    <label htmlFor={`resolution-${conflict.id}`}>Custom resolution for conflict {conflict.id}</label>
                    <textarea className="resolution-input" id={`resolution-${conflict.id}`} value={custom[conflict.id] || ''} onChange={event => setCustom(previous => ({ ...previous, [conflict.id]: event.target.value }))} />
                    <button className="clear-button" onClick={() => resolveConflict(conflict, custom[conflict.id] ? custom[conflict.id].split('\n') : [])}>Apply custom resolution</button>
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

