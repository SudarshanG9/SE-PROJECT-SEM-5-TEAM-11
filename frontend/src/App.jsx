import { useState } from 'react'
import './App.css'

function App() {
  const [base, setBase] = useState('')
  const [branchA, setBranchA] = useState('')
  const [branchB, setBranchB] = useState('')
  const [result, setResult] = useState('')

  function handleMerge() {
    setResult(
      'Placeholder merge result\n\n' +
      'Base:\n' + (base || '(empty)') + '\n\n' +
      'Branch A:\n' + (branchA || '(empty)') + '\n\n' +
      'Branch B:\n' + (branchB || '(empty)') + '\n\n' +
      'Real merge logic will be integrated later.'
    )
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
        <button type="button" onClick={handleMerge}>
          Simulate Merge
        </button>

        <button
          type="button"
          className="clear-button"
          onClick={() => {
            setBase('')
            setBranchA('')
            setBranchB('')
            setResult('')
          }}
        >
          Clear All
        </button>
      </div>

      {result && (
        <section className="result-card" aria-live="polite">
          <h2>Merge Result</h2>
          <pre>{result}</pre>
        </section>
      )}
    </main>
  )
}

export default App