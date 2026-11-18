import { useEffect, useRef, useState } from 'react'

async function request(url, options = {}) {
  const response = await fetch(url, options)
  const data = await response.json().catch(() => null)
  if (!response.ok || !data) throw new Error(data?.error || 'The commit service returned an invalid response.')
  return data
}

export default function CommitManager(props) {
  const [opened, setOpened] = useState(false)
  return <details onToggle={(event) => { if (event.currentTarget.open) setOpened(true) }}>
    <summary>Manage commits</summary>
    {opened && <CommitForm {...props} />}
  </details>
}

function CommitForm({ repositoryUrl, session, onCommitted }) {
  const [attempt, setAttempt] = useState(0)
  const [loaded, setLoaded] = useState(null)
  const [branchId, setBranchId] = useState('')
  const [selected, setSelected] = useState([])
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(null)
  const submitting = useRef(false)
  const key = `${repositoryUrl}/${attempt}`
  const data = loaded?.key === key ? loaded : null

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      request(`${repositoryUrl}/branches`, { signal: controller.signal }),
      request(`${repositoryUrl}/files`, { signal: controller.signal }),
    ]).then(([branches, files]) => {
      if (!Array.isArray(branches.branches) || !Array.isArray(files.files)) {
        throw new Error('Could not load commit branches and files.')
      }
      if (!controller.signal.aborted) {
        setLoaded({ key, branches: branches.branches, files: files.files })
        setBranchId((branches.branches.find((branch) => branch.isDefault) || branches.branches[0])?.id || '')
      }
    }).catch((failure) => {
      if (!controller.signal.aborted) setLoaded({ key, error: failure.message })
    })
    return () => controller.abort()
  }, [repositoryUrl, attempt, key])

  function refresh() {
    setError('')
    setSelected([])
    setAttempt((value) => value + 1)
  }

  async function save(event) {
    event.preventDefault()
    if (submitting.current || !message.trim() || !selected.length) return
    const branch = data.branches.find((item) => item.id === branchId)
    if (!branch) return
    submitting.current = true
    setPending(true)
    setError('')
    setSaved(null)
    try {
      const result = await request(`${repositoryUrl}/commits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',
          ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}) },
        body: JSON.stringify({ branchId, message: message.trim(), fileIds: selected,
          expectedHeadCommitId: branch.headCommitId }),
      })
      if (!result.commit?.id || !Array.isArray(result.commit.files) ||
          result.branch?.headCommitId !== result.commit.id) {
        throw new Error('The commit service did not acknowledge the saved snapshot.')
      }
      setSaved(result.commit)
      setMessage('')
      setSelected([])
      setLoaded({ ...data, branches: data.branches.map((item) => item.id === branchId ? result.branch : item) })
      onCommitted?.()
    } catch (failure) { setError(failure.message) }
    finally { submitting.current = false; setPending(false) }
  }

  return <section aria-label="Commit management" className="repository-form">
    <h3>Save selected files as a commit</h3>
    <p>Save edits in the file editor first, then refresh this list. Only selected files are captured.
      File snapshots are stored separately from the code used by branch merge simulations.</p>
    <button type="button" disabled={pending} onClick={refresh}>Refresh commit files</button>
    {!data ? <p role="status">Loading commit files…</p> : data.error ? <p role="alert">{data.error}</p> : (
      <form onSubmit={save}>
        <label htmlFor="commit-target-branch">Commit branch</label>
        <select id="commit-target-branch" value={branchId} disabled={pending}
          onChange={(event) => setBranchId(event.target.value)}>
          {data.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
        </select>
        {!data.branches.length && <p>No branches available.</p>}
        <fieldset disabled={pending}>
          <legend>Select files to commit</legend>
          <p>{selected.length} of 100 files selected</p>
          {!data.files.length && <p>No files available. Create a file first.</p>}
          {data.files.map((file) => <label key={file.id} style={{ display: 'block' }}>
            <input type="checkbox" checked={selected.includes(file.id)}
              disabled={!selected.includes(file.id) && selected.length >= 100}
              onChange={(event) => setSelected((current) => event.target.checked
                ? [...current, file.id] : current.filter((id) => id !== file.id))} />
            {file.name}
          </label>)}
        </fieldset>
        <label htmlFor="selected-files-message">File commit message</label>
        <input id="selected-files-message" value={message} required disabled={pending}
          onChange={(event) => setMessage(event.target.value)} />
        <button type="submit" disabled={pending || !branchId || !selected.length || !message.trim()}>
          {pending ? 'Saving selected files…' : 'Commit selected files'}
        </button>
      </form>
    )}
    {error && <p role="alert">{error}</p>}
    {saved && <div role="status">Commit saved: <code>{saved.id}</code> — {saved.files.length} files.
      {saved.files.map((file) => <details key={file.fileId}><summary>{file.name}</summary><pre>{file.content}</pre></details>)}
    </div>}
  </section>
}
