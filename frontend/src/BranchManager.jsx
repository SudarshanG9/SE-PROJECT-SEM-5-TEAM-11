import { useEffect, useState } from 'react'
import './BranchManager.css'

const API_BASE = `${import.meta.env.VITE_API_URL || ''}/api`

function BranchManager() {
  const [repositories, setRepositories] = useState([])
  const [repositoryId, setRepositoryId] = useState('')
  const [branches, setBranches] = useState([])
  const [commits, setCommits] = useState([])
  const [selectedBranchId, setSelectedBranchId] = useState('')

  const [branchName, setBranchName] = useState('')
  const [baseSelection, setBaseSelection] = useState('')

  const [commitMessage, setCommitMessage] = useState('')
  const [commitCode, setCommitCode] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')

  async function request(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    let data

    try {
      data = await response.json()
    } catch {
      throw new Error('The backend returned an invalid response.')
    }

    if (!response.ok) {
      throw new Error(data?.error || 'The request could not be completed.')
    }

    return data
  }

  async function loadRepositories() {
    const data = await request(`${API_BASE}/repositories`)
    const items = Array.isArray(data.repositories) ? data.repositories : []

    setRepositories(items)

    if (items.length > 0) {
      setRepositoryId((current) => {
        if (items.some((item) => item.id === current)) return current
        return items[0].id
      })
    } else {
      setRepositoryId('')
      setBranches([])
      setCommits([])
      setSelectedBranchId('')
    }
  }

  async function loadRepositoryData(id) {
    if (!id) return

    setLoading(true)
    setError('')

    try {
      const [branchData, commitData] = await Promise.all([
        request(`${API_BASE}/repositories/${id}/branches`),
        request(`${API_BASE}/repositories/${id}/commits`),
      ])

      const nextBranches = Array.isArray(branchData.branches)
        ? branchData.branches
        : []

      const nextCommits = Array.isArray(commitData.commits)
        ? commitData.commits
        : []

      setBranches(nextBranches)
      setCommits(nextCommits)

      setSelectedBranchId((current) => {
        if (nextBranches.some((branch) => branch.id === current)) return current
        return nextBranches.find((branch) => branch.isDefault)?.id ||
          nextBranches[0]?.id ||
          ''
      })

      setBaseSelection((current) => {
        if (current.startsWith('branch:')) {
          const idFromSelection = current.slice('branch:'.length)
          if (nextBranches.some((branch) => branch.id === idFromSelection)) {
            return current
          }
        }

        if (current.startsWith('commit:')) {
          const idFromSelection = current.slice('commit:'.length)
          if (nextCommits.some((commit) => commit.id === idFromSelection)) {
            return current
          }
        }

        const defaultBranch = nextBranches.find((branch) => branch.isDefault)
        return defaultBranch ? `branch:${defaultBranch.id}` : ''
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
  if (import.meta.env.MODE !== 'test') {
    loadRepositories().catch((err) => setError(err.message))
  }
}, [])

  useEffect(() => {
    if (repositoryId) {
      loadRepositoryData(repositoryId)
    }
  }, [repositoryId])

  async function refreshData() {
    await loadRepositoryData(repositoryId)
  }

  async function handleCreateBranch(event) {
    event.preventDefault()
    setError('')
    setFeedback('')

    if (!branchName.trim()) {
      setError('Enter a branch name.')
      return
    }

    if (!baseSelection) {
      setError('Select a base branch or commit.')
      return
    }

    const [sourceType, sourceId] = baseSelection.split(':')

    const body = {
      name: branchName.trim(),
      ...(sourceType === 'branch'
        ? { sourceBranchId: sourceId }
        : { sourceCommitId: sourceId }),
    }

    setLoading(true)

    try {
      const data = await request(
        `${API_BASE}/repositories/${repositoryId}/branches`,
        {
          method: 'POST',
          body: JSON.stringify(body),
        }
      )

      setBranchName('')
      setFeedback('Branch created successfully.')

      await refreshData()
      setSelectedBranchId(data.branch.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRename(branch) {
    const newName = window.prompt('Enter the new branch name:', branch.name)

    if (newName === null) return

    if (!newName.trim()) {
      setError('Branch name cannot be empty.')
      return
    }

    setError('')
    setFeedback('')

    try {
      await request(
        `${API_BASE}/repositories/${repositoryId}/branches/${branch.id}`,
        {
          method: 'PUT',
          body: JSON.stringify({ name: newName }),
        }
      )

      setFeedback('Branch renamed successfully.')
      await refreshData()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete(branch) {
    if (branch.isDefault || branch.isProtected) {
      setError('The default or protected branch cannot be deleted.')
      return
    }

    const confirmed = window.confirm(
      `Delete branch "${branch.name}"? Its commits will be retained.`
    )

    if (!confirmed) return

    setError('')
    setFeedback('')

    try {
      await request(
        `${API_BASE}/repositories/${repositoryId}/branches/${branch.id}`,
        { method: 'DELETE' }
      )

      if (selectedBranchId === branch.id) {
        setSelectedBranchId('')
      }

      setFeedback('Branch deleted successfully.')
      await refreshData()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleCreateCommit(event) {
    event.preventDefault()
    setError('')
    setFeedback('')

    if (!selectedBranchId) {
      setError('Select a branch before creating a commit.')
      return
    }

    if (!commitMessage.trim()) {
      setError('Enter a commit message.')
      return
    }

    setLoading(true)

    try {
      await request(`${API_BASE}/repositories/${repositoryId}/commits`, {
        method: 'POST',
        body: JSON.stringify({
          branchId: selectedBranchId,
          message: commitMessage,
          code: commitCode,
        }),
      })

      setCommitMessage('')
      setFeedback('Commit created successfully.')
      await refreshData()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const selectedBranch = branches.find(
    (branch) => branch.id === selectedBranchId
  )

  const selectedBranchCommits = (() => {
  if (!selectedBranch) return []

  const commitsById = new Map(
    commits.map((commit) => [commit.id, commit])
  )

  const history = []
  const visited = new Set()
  let currentCommitId = selectedBranch.headCommitId

  while (currentCommitId && !visited.has(currentCommitId)) {
    visited.add(currentCommitId)

    const commit = commitsById.get(currentCommitId)
    if (!commit) break

    history.push(commit)
    currentCommitId = commit.parentCommitId
  }

  return history
})()

  return (
    <section className="branch-section" aria-label="Branch management">
      <div className="branch-heading">
        <div>
          <p className="section-kicker">04 / BRANCHES</p>
          <h2>Branch management</h2>
          <p className="section-description">
            Create branches from existing branches or commits, manage branch
            names, and track commit snapshots.
          </p>
        </div>

        <span className="branch-count">
          {branches.length} {branches.length === 1 ? 'BRANCH' : 'BRANCHES'}
        </span>
      </div>

      {error && (
        <div className="branch-message branch-error" role="alert">
          {error}
        </div>
      )}

      {feedback && (
        <div className="branch-message branch-success" role="status">
          {feedback}
        </div>
      )}

      <div className="branch-repository-picker">
        <label htmlFor="branch-repository">Choose repository</label>
        <select
          id="branch-repository"
          value={repositoryId}
          onChange={(event) => {
            setRepositoryId(event.target.value)
            setError('')
            setFeedback('')
          }}
          disabled={repositories.length === 0 || loading}
        >
          {repositories.length === 0 ? (
            <option value="">No repositories available</option>
          ) : (
            repositories.map((repository) => (
              <option key={repository.id} value={repository.id}>
                {repository.name}
              </option>
            ))
          )}
        </select>
      </div>

      {!repositoryId ? (
        <p className="branch-empty">
          Create a repository first to start managing branches.
        </p>
      ) : (
        <>
          <div className="branch-layout">
            <div className="branch-panel">
              <div className="branch-panel-heading">
                <h3>Branches</h3>
                <span>{branches.length} total</span>
              </div>

              {loading && branches.length === 0 ? (
                <p className="branch-empty">Loading branches...</p>
              ) : branches.length === 0 ? (
                <p className="branch-empty">No branches found.</p>
              ) : (
                <div className="branch-list">
                  {branches.map((branch) => (
                    <article
                      className={`branch-item ${
                        selectedBranchId === branch.id ? 'is-selected' : ''
                      }`}
                      key={branch.id}
                    >
                      <button
                        type="button"
                        className="branch-select"
                        onClick={() => setSelectedBranchId(branch.id)}
                      >
                        <span className="branch-symbol" aria-hidden="true">
                          ⑂
                        </span>

                        <span className="branch-item-info">
                          <strong>{branch.name}</strong>
                          <small>
                            {branch.isDefault
                              ? 'Default branch'
                              : `Created ${new Date(branch.createdAt).toLocaleDateString()}`}
                          </small>
                        </span>

                        {branch.isProtected && (
                          <span className="branch-protected">Protected</span>
                        )}
                      </button>

                      <div className="branch-item-actions">
                        <button
                          type="button"
                          onClick={() => handleRename(branch)}
                          disabled={branch.isDefault || branch.isProtected}
                        >
                          Rename
                        </button>

                        <button
                          type="button"
                          className="branch-delete"
                          onClick={() => handleDelete(branch)}
                          disabled={branch.isDefault || branch.isProtected}
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <form className="branch-panel branch-create-form" onSubmit={handleCreateBranch}>
              <h3>Create a branch</h3>

              <label htmlFor="new-branch-name">New branch name</label>
              <input
                id="new-branch-name"
                value={branchName}
                onChange={(event) => setBranchName(event.target.value)}
                placeholder="e.g. feature/login-page"
                maxLength={100}
                required
              />

              <label htmlFor="branch-base">Create from</label>
              <select
                id="branch-base"
                value={baseSelection}
                onChange={(event) => setBaseSelection(event.target.value)}
                required
              >
                <optgroup label="Existing branches">
                  {branches.map((branch) => (
                    <option key={branch.id} value={`branch:${branch.id}`}>
                      {branch.name} (latest commit)
                    </option>
                  ))}
                </optgroup>

                <optgroup label="Existing commits">
                  {commits.map((commit) => (
                    <option key={commit.id} value={`commit:${commit.id}`}>
                      {commit.message} — {new Date(commit.createdAt).toLocaleString()}
                    </option>
                  ))}
                </optgroup>
              </select>

              <p className="branch-help">
                The new branch starts from the exact snapshot of the selected
                branch or commit.
              </p>

              <button
                type="submit"
                className="branch-primary-button"
                disabled={loading || !repositoryId}
              >
                Create branch
              </button>
            </form>
          </div>

          <div className="branch-details-grid">
            <section className="branch-panel">
              <h3>Selected branch</h3>

              {selectedBranch ? (
                <>
                  <div className="branch-detail-name">
                    <span className="branch-symbol" aria-hidden="true">⑂</span>
                    <strong>{selectedBranch.name}</strong>
                  </div>

                  <p>
                    <strong>Branch ID:</strong> {selectedBranch.id}
                  </p>

                  <p>
                    <strong>Starting commit:</strong>{' '}
                    {selectedBranch.baseCommitId || 'Initial repository state'}
                  </p>

                  <p>
                    <strong>Latest commit:</strong>{' '}
                    {selectedBranch.headCommitId}
                  </p>

                  <p>
                    <strong>Protection:</strong>{' '}
                    {selectedBranch.isProtected ? 'Protected' : 'Not protected'}
                  </p>
                </>
              ) : (
                <p className="branch-empty">Select a branch to view its details.</p>
              )}
            </section>

            <section className="branch-panel">
              <h3>Commit history</h3>

              {!selectedBranch ? (
                <p className="branch-empty">Select a branch first.</p>
              ) : selectedBranchCommits.length === 0 ? (
                <p className="branch-empty">No commits found for this branch.</p>
              ) : (
                <div className="branch-commit-list">
                  {selectedBranchCommits.map((commit) => (
                    <article className="branch-commit" key={commit.id}>
                      <strong>{commit.message}</strong>
                      <small>{new Date(commit.createdAt).toLocaleString()}</small>
                      <code>{commit.id}</code>
                      <small>
                        Parent: {commit.parentCommitId || 'No parent commit'}
                      </small>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>

          <form className="branch-panel branch-commit-form" onSubmit={handleCreateCommit}>
            <h3>Create a commit snapshot</h3>

            <p className="branch-help">
              Save a code snapshot on the currently selected branch. The new
              commit becomes that branch's latest commit.
            </p>

            <label htmlFor="commit-message">Commit message</label>
            <input
              id="commit-message"
              value={commitMessage}
              onChange={(event) => setCommitMessage(event.target.value)}
              placeholder="e.g. Add login validation"
              maxLength={200}
              required
              disabled={!selectedBranch}
            />

            <label htmlFor="commit-code">Code snapshot</label>
            <textarea
              id="commit-code"
              value={commitCode}
              onChange={(event) => setCommitCode(event.target.value)}
              placeholder="Paste the code snapshot to save..."
              rows={6}
              spellCheck="false"
              disabled={!selectedBranch}
            />

            <button
              type="submit"
              className="branch-primary-button"
              disabled={loading || !selectedBranch}
            >
              Save commit
            </button>
          </form>
        </>
      )}
    </section>
  )
}

export default BranchManager