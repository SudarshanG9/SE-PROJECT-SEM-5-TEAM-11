import { useEffect, useRef, useState } from 'react'
import MergeConfirmation from './MergeConfirmation'

async function request(url, options) {
  const response = await fetch(url, options)
  const data = await response.json().catch(() => null)
  if (!response.ok || !data) {
    throw new Error(data?.error || 'The merge service did not return a valid response.')
  }
  return data
}

export default function RepositoryMerge({ repositoryUrl, session }) {
  const [branches, setBranches] = useState(null)
  const [sourceBranchId, setSourceBranchId] = useState('')
  const [targetBranchId, setTargetBranchId] = useState('')
  const [preview, setPreview] = useState(null)
  const [pending, setPending] = useState('')
  const [error, setError] = useState('')
  const [finalized, setFinalized] = useState(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const previewButton = useRef(null)
  const canApprove = ['maintainer', 'owner'].includes(session.user.role)

  useEffect(() => {
    const controller = new AbortController()
    request(`${repositoryUrl}/branches`, { signal: controller.signal })
      .then(({ branches: available }) => {
        if (!Array.isArray(available)) throw new Error('Could not load repository branches.')
        if (controller.signal.aborted) return
        setBranches(available)
        setTargetBranchId((available.find((branch) => branch.isDefault) || available[0])?.id || '')
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(failure.message)
      })
    return () => controller.abort()
  }, [repositoryUrl, loadAttempt])

  function clearFeedback() {
    setPreview(null)
    setError('')
    setFinalized(null)
  }

  function post(path, payload) {
    return request(`${repositoryUrl}/merges${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify(payload),
    })
  }

  async function handlePreview() {
    clearFeedback()
    setPending('preview')
    try {
      const result = await post('/preview', { sourceBranchId, targetBranchId })
      if (result.source?.id !== sourceBranchId || result.target?.id !== targetBranchId ||
          !result.source.headCommitId || !result.target.headCommitId ||
          typeof result.mergedCode !== 'string' || !Array.isArray(result.conflicts)) {
        throw new Error('The merge service returned an incomplete preview.')
      }
      setPreview(result)
    } catch (failure) {
      setError(failure.message)
    } finally {
      setPending('')
    }
  }

  async function handleConfirm() {
    setError('')
    setPending('finalize')
    try {
      const result = await post('', {
        sourceBranchId: preview.source.id,
        targetBranchId: preview.target.id,
        sourceHeadCommitId: preview.source.headCommitId,
        targetHeadCommitId: preview.target.headCommitId,
        confirmed: true,
      })
      if (!result.commit?.id || result.branch?.headCommitId !== result.commit.id) {
        throw new Error('The merge service did not acknowledge the merge commit.')
      }
      setFinalized({ target: result.branch.name, commitId: result.commit.id })
      setPreview(null)
    } catch (failure) {
      setError(failure.message)
    } finally {
      setPending('')
    }
  }

  function handleCancel() {
    clearFeedback()
    previewButton.current.focus()
  }

  return (
    <section aria-labelledby="repository-merge-heading">
      <h3 id="repository-merge-heading">Merge branches</h3>
      {error && <p className="error-banner" role="alert">{error}</p>}
      {pending && <p role="status">{pending === 'preview' ? 'Preparing preview…' : 'Finalizing merge…'}</p>}
      {finalized && (
        <p role="status">Merge finalized on <strong>{finalized.target}</strong>. Commit <code>{finalized.commitId}</code>.</p>
      )}
      {branches === null ? (
        error ? (
          <button type="button" className="repository-secondary-button" onClick={() => {
            setError('')
            setLoadAttempt((attempt) => attempt + 1)
          }}>
            Retry loading branches
          </button>
        ) : <p role="status">Loading branches…</p>
      ) : branches.length < 2 ? (
        <p>Create another branch before starting a merge.</p>
      ) : (
        <div className="repository-form">
          <label htmlFor="merge-source">Source branch</label>
          <select id="merge-source" value={sourceBranchId} disabled={Boolean(pending)}
            onChange={(event) => {
              setSourceBranchId(event.target.value)
              clearFeedback()
            }}>
            <option value="">Select a source branch</option>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
          <label htmlFor="merge-target">Target branch</label>
          <select id="merge-target" value={targetBranchId} disabled={Boolean(pending)}
            onChange={(event) => {
              setTargetBranchId(event.target.value)
              clearFeedback()
            }}>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
          {sourceBranchId && sourceBranchId === targetBranchId && <p>Select two different branches.</p>}
          <div className="actions">
            <button type="button" ref={previewButton} onClick={handlePreview}
              disabled={Boolean(pending) || !sourceBranchId || sourceBranchId === targetBranchId}>
              Preview merge
            </button>
          </div>
        </div>
      )}
      {preview && (
        <MergeConfirmation preview={preview} canApprove={canApprove} finalizing={pending === 'finalize'}
          onConfirm={handleConfirm} onCancel={handleCancel} />
      )}
    </section>
  )
}
