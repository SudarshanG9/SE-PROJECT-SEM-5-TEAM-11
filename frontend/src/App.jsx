import { useState } from 'react'
import CodeVersionInput from './CodeVersionInput'
import MergeInstructions from './MergeInstructions'
import AuthPanel from './AuthPanel'
import './App.css'
import RepositoryManager from './RepositoryManager'


const API_URL = '/api/merge'
const SESSION_STORAGE_KEY = 'codeMergeSimulatorSession'

function getStoredSession() {
  try {
    const storedSession = localStorage.getItem(SESSION_STORAGE_KEY)

    if (!storedSession) {
      return null
    }

    const session = JSON.parse(storedSession)

    if (!session?.token || !session?.user) {
      localStorage.removeItem(SESSION_STORAGE_KEY)
      return null
    }

    return session
  } catch {
    localStorage.removeItem(SESSION_STORAGE_KEY)
    return null
  }
}


function App() {
  const [view, setView] = useState('simulator')
  const [session, setSession] = useState(getStoredSession)

  const currentUser = session?.user || null

  const [codeVersions, setCodeVersions] = useState({
    base: '',
    branchA: '',
    branchB: '',
  })

  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function handleLoginSuccess(user, token) {
    const newSession = {
      user,
      token,
    }

    localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify(newSession)
    )

    setSession(newSession)
    setView('simulator')
  }

async function handleLogout() {
  try {
    if (session?.token) {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Logout request failed.')
      }
    }
  } catch {
    setError('Could not contact the server. Your local session was cleared.')
  } finally {
    localStorage.removeItem(SESSION_STORAGE_KEY)
    setSession(null)
    setView('simulator')
  }
}


  function updateCodeVersion(version, value) {
    setCodeVersions((currentVersions) => ({
      ...currentVersions,
      [version]: value,
    }))
  }

  async function handleMerge() {
    setError(null)
    setResult(null)

    if (Object.values(codeVersions).some((code) => !code.trim())) {
      setError(
        'Enter code in Base Version, Branch A Version, and Branch B Version before simulating a merge.'
      )
      return
    }

    setLoading(true)

    try {
     const response = await fetch(API_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...(session?.token
      ? { Authorization: `Bearer ${session.token}` }
      : {}),
  },
  body: JSON.stringify(codeVersions),
})

      let data
      try {
        data = await response.json()
      } catch {
        setError('The merge service returned an invalid response. Please try again.')
        return
      }

      if (!response.ok) {
        setError(
          typeof data?.error === 'string'
            ? data.error
            : `Server error: ${response.status}`
        )
        return
      }

      if (
        !data ||
        typeof data !== 'object' ||
        typeof data.mergedCode !== 'string' ||
        typeof data.hasConflict !== 'boolean' ||
        typeof data.message !== 'string' ||
        !Array.isArray(data.conflicts)
      ) {
        setError('The merge service returned an incomplete result. Please try again.')
        return
      }

      setResult(data)
    } catch {
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
     {currentUser && (
  <div className="user-welcome">
    <p role="status">
      Logged in as <strong>{currentUser.name}</strong>
      {' '}({currentUser.role})
    </p>

    <button type="button" onClick={handleLogout}>
      Log Out
    </button>
  </div>
)}

      <nav className="view-navigation" aria-label="Main navigation">
        <button
  type="button"
  aria-current={view === 'auth' ? 'page' : undefined}
  onClick={() => setView('auth')}
>
  Account
</button>
<button
  type="button"
  aria-current={view === 'repositories' ? 'page' : undefined}
  onClick={() => setView('repositories')}
>
  Repositories
</button>
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
      {view === 'auth' && (
  <AuthPanel onLoginSuccess={handleLoginSuccess} />
)}

      {view === 'guide' && <MergeInstructions />}
      {view === 'repositories' && <RepositoryManager />}
      <div hidden={view !== 'simulator'}>
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
      </div>
    </main>
  )
}


export default App