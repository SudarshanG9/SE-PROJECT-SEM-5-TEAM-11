import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import './FileManager.css'

const API_ROOT = `${import.meta.env.VITE_API_URL || ''}/api/repositories`
const MAX_FILE_SIZE = 1024 * 1024
const ALLOWED_EXTENSIONS = new Set([
  'c', 'cc', 'cpp', 'cs', 'css', 'go', 'h', 'hpp', 'html', 'java', 'js',
  'json', 'jsx', 'md', 'php', 'py', 'rb', 'rs', 'scss', 'sh', 'sql', 'svg',
  'text', 'ts', 'tsx', 'txt', 'xml', 'yaml', 'yml',
])

function isValidFileName(name) {
  const trimmedName = name.trim()
  return (
    trimmedName.length > 0 &&
    trimmedName.length <= 255 &&
    trimmedName !== '.' &&
    trimmedName !== '..' &&
    !/[\\/]/.test(trimmedName)
  )
}

function getFileExtension(name) {
  const separator = name.lastIndexOf('.')
  return separator < 0 ? '' : name.slice(separator + 1).toLowerCase()
}

function formatFileSize(content) {
  const bytes = new TextEncoder().encode(content).length
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

function getLanguage(name) {
  const extension = getFileExtension(name)
  const languages = {
    c: 'C',
    cc: 'C++',
    cpp: 'C++',
    cs: 'C#',
    css: 'CSS',
    go: 'Go',
    h: 'C/C++',
    hpp: 'C++',
    html: 'HTML',
    java: 'Java',
    js: 'JavaScript',
    json: 'JSON',
    jsx: 'React JSX',
    md: 'Markdown',
    php: 'PHP',
    py: 'Python',
    rb: 'Ruby',
    rs: 'Rust',
    scss: 'SCSS',
    sh: 'Shell',
    sql: 'SQL',
    svg: 'SVG',
    ts: 'TypeScript',
    tsx: 'React TSX',
    xml: 'XML',
    yaml: 'YAML',
    yml: 'YAML',
  }
  return languages[extension] || 'Plain text'
}

const FileManager = forwardRef(function FileManager({ repositoryId }, ref) {
  const [files, setFiles] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [openingId, setOpeningId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  const [newFileContent, setNewFileContent] = useState('')
  const [creating, setCreating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const editorRef = useRef(null)
  const dirty = Boolean(selectedFile && draft !== selectedFile.content)

  async function request(url, options = {}) {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })

    let data
    try {
      data = await response.json()
    } catch {
      throw new Error('Backend returned an invalid response.')
    }

    if (!response.ok) {
      throw new Error(data?.error || 'Request failed. Please try again.')
    }
    return data
  }

  const loadFiles = useCallback(async () => {
    try {
      const data = await request(`${API_ROOT}/${repositoryId}/files`)
      if (!Array.isArray(data?.files)) {
        throw new Error('Backend returned an invalid file list.')
      }
      setError('')
      setFiles(data.files)
    } catch (requestError) {
      setError(requestError.message || 'Unable to load repository files.')
    } finally {
      setLoading(false)
    }
  }, [repositoryId])

  useEffect(() => {
    const timer = window.setTimeout(loadFiles, 0)
    return () => window.clearTimeout(timer)
  }, [loadFiles])

  useEffect(() => {
    if (!dirty) return undefined

    function warnBeforeUnload(event) {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [dirty])

  const saveFile = useCallback(async () => {
    if (!selectedFile || !dirty || saving) return Boolean(selectedFile)

    setSaving(true)
    setError('')
    setFeedback('')
    try {
      const data = await request(
        `${API_ROOT}/${repositoryId}/files/${selectedFile.id}`,
        {
          method: 'PUT',
          body: JSON.stringify({ content: draft }),
        }
      )
      if (!data?.file || typeof data.file.content !== 'string') {
        throw new Error('Backend returned an invalid file response.')
      }
      setSelectedFile(data.file)
      setDraft(data.file.content)
      setFiles(previous =>
        previous.map(file => file.id === data.file.id ? data.file : file)
      )
      setFeedback('File saved successfully.')
      return true
    } catch (requestError) {
      setError(requestError.message || 'Unable to save this file.')
      return false
    } finally {
      setSaving(false)
    }
  }, [dirty, draft, repositoryId, saving, selectedFile])

  const prepareToLeave = useCallback(async () => {
    if (!dirty) return true
    if (!window.confirm('This file has unsaved changes. Save them before leaving?')) {
      return false
    }
    return saveFile()
  }, [dirty, saveFile])

  useImperativeHandle(ref, () => ({ prepareToLeave }), [prepareToLeave])

  async function openFile(file) {
    if (selectedFile?.id === file.id || openingId) return
    if (!(await prepareToLeave())) return

    setOpeningId(file.id)
    setError('')
    setFeedback('')
    try {
      const data = await request(`${API_ROOT}/${repositoryId}/files/${file.id}`)
      if (!data?.file || typeof data.file.content !== 'string') {
        throw new Error('Backend returned an invalid file response.')
      }
      setSelectedFile(data.file)
      setDraft(data.file.content)
    } catch (requestError) {
      setError(requestError.message || 'Unable to open this file.')
    } finally {
      setOpeningId(null)
    }
  }

  function validateName(name) {
    if (!isValidFileName(name)) {
      return 'Enter a filename of 1-255 characters without path separators.'
    }
    if (files.some(file => file.name.toLowerCase() === name.trim().toLowerCase())) {
      return 'A file with this name already exists in this repository.'
    }
    return ''
  }

  async function createFile(name, content) {
    const validationError = validateName(name)
    if (validationError) {
      setError(validationError)
      return false
    }

    setCreating(true)
    setError('')
    setFeedback('')
    try {
      const data = await request(`${API_ROOT}/${repositoryId}/files`, {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), content }),
      })
      if (!data?.file || typeof data.file.id !== 'string') {
        throw new Error('Backend returned an invalid file response.')
      }
      setFiles(previous =>
        [...previous, data.file].sort((a, b) => a.name.localeCompare(b.name))
      )
      setFeedback(`${data.file.name} created successfully.`)
      return true
    } catch (requestError) {
      setError(requestError.message || 'Unable to create this file.')
      return false
    } finally {
      setCreating(false)
    }
  }

  async function handleCreate(event) {
    event.preventDefault()
    if (await createFile(newFileName, newFileContent)) {
      setNewFileName('')
      setNewFileContent('')
      setShowCreateForm(false)
    }
  }

  async function handleUpload(event) {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    input.value = ''

    if (file.size > MAX_FILE_SIZE) {
      setError('Files must be 1 MB or smaller.')
      return
    }
    if (!ALLOWED_EXTENSIONS.has(getFileExtension(file.name))) {
      setError('Choose a supported text or code file.')
      return
    }
    const validationError = validateName(file.name)
    if (validationError) {
      setError(validationError)
      return
    }

    setUploading(true)
    setError('')
    setFeedback('')
    try {
      const content = await file.text()
      const created = await createFile(file.name, content)
      if (created) setFeedback(`${file.name} uploaded successfully.`)
    } catch (uploadError) {
      setError(uploadError.message || 'Unable to read the selected file.')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(file) {
    const hasUnsavedChanges = selectedFile?.id === file.id && dirty
    const message = hasUnsavedChanges
      ? `Delete "${file.name}"? Its unsaved changes will be discarded.`
      : `Delete "${file.name}"? This action cannot be undone.`
    if (!window.confirm(message)) return

    setDeletingId(file.id)
    setError('')
    setFeedback('')
    try {
      await request(`${API_ROOT}/${repositoryId}/files/${file.id}`, {
        method: 'DELETE',
      })
      setFiles(previous => previous.filter(item => item.id !== file.id))
      if (selectedFile?.id === file.id) {
        setSelectedFile(null)
        setDraft('')
      }
      setFeedback(`${file.name} deleted successfully.`)
    } catch (requestError) {
      setError(requestError.message || 'Unable to delete this file.')
    } finally {
      setDeletingId(null)
    }
  }

  async function closeEditor() {
    if (!(await prepareToLeave())) return
    setSelectedFile(null)
    setDraft('')
  }

  function handleEditorKeyDown(event) {
    if (event.key !== 'Tab') return
    event.preventDefault()
    const editor = editorRef.current
    const start = editor.selectionStart
    const end = editor.selectionEnd
    const nextDraft = `${draft.slice(0, start)}  ${draft.slice(end)}`
    setDraft(nextDraft)
    requestAnimationFrame(() => editor.setSelectionRange(start + 2, start + 2))
  }

  return (
    <section className="file-manager" aria-label="Repository files">
      <div className="file-manager-heading">
        <div>
          <p className="section-kicker">REPOSITORY WORKSPACE</p>
          <h3>Files</h3>
          <p className="file-manager-description">
            Browse and edit text and code files in this repository.
          </p>
        </div>
        <div className="file-manager-actions">
          <button
            type="button"
            className="file-action-button"
            onClick={() => {
              setShowCreateForm(value => !value)
              setError('')
            }}
          >
            {showCreateForm ? 'Cancel' : 'New file'}
          </button>
          <label className={`file-action-button file-upload-button${uploading ? ' is-disabled' : ''}`}>
            {uploading ? 'Uploading...' : 'Upload file'}
            <input
              type="file"
              aria-label="Upload text or code file"
              accept={[...ALLOWED_EXTENSIONS].map(extension => `.${extension}`).join(',')}
              disabled={uploading}
              onChange={handleUpload}
            />
          </label>
          <button
            type="button"
            className="file-action-button"
            onClick={() => {
              setLoading(true)
              setError('')
              loadFiles()
            }}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="file-message file-error" role="alert">{error}</div>}
      {feedback && <div className="file-message file-success" role="status">{feedback}</div>}

      {showCreateForm && (
        <form className="file-create-form" onSubmit={handleCreate}>
          <label htmlFor="new-file-name">Filename</label>
          <input
            id="new-file-name"
            value={newFileName}
            onChange={event => setNewFileName(event.target.value)}
            placeholder="e.g. src/index.js"
            maxLength={255}
            required
          />
          <label htmlFor="new-file-content">Initial content</label>
          <textarea
            id="new-file-content"
            value={newFileContent}
            onChange={event => setNewFileContent(event.target.value)}
            placeholder="Optional starter content"
            rows={4}
            spellCheck="false"
          />
          <button type="submit" className="file-action-button" disabled={creating}>
            {creating ? 'Creating...' : 'Create file'}
          </button>
        </form>
      )}

      <div className="file-manager-layout">
        <div className="file-list-panel">
          <div className="file-list-heading">
            <h4>Repository files</h4>
            <span>{files.length}</span>
          </div>

          {loading ? (
            <p className="file-empty">Loading files...</p>
          ) : files.length === 0 ? (
            <p className="file-empty">This repository has no files yet. Create or upload one to get started.</p>
          ) : (
            <ul className="file-list">
              {files.map(file => (
                <li className={`file-list-item${selectedFile?.id === file.id ? ' is-selected' : ''}`} key={file.id}>
                  <button
                    type="button"
                    className="file-open-button"
                    aria-label={`Open ${file.name}`}
                    onClick={() => openFile(file)}
                    disabled={Boolean(openingId) || saving}
                  >
                    <span className="file-name">{file.name}</span>
                    <span className="file-information">
                      {getLanguage(file.name)} · {formatFileSize(file.content || '')}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="file-delete-button"
                    aria-label={`Delete ${file.name}`}
                    onClick={() => handleDelete(file)}
                    disabled={deletingId === file.id}
                  >
                    {deletingId === file.id ? 'Deleting...' : 'Delete'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="file-editor-panel">
          {selectedFile ? (
            <>
              <div className="file-editor-heading">
                <div>
                  <p className="section-kicker">CODE EDITOR</p>
                  <h4>{selectedFile.name}</h4>
                </div>
                <div className="file-editor-actions">
                  <span className={`file-save-state${dirty ? ' is-dirty' : ''}`}>
                    {dirty ? 'Unsaved changes' : getLanguage(selectedFile.name)}
                  </span>
                  <button type="button" className="file-action-button" onClick={closeEditor}>
                    Close editor
                  </button>
                  <button
                    type="button"
                    className="file-action-button file-save-button"
                    onClick={saveFile}
                    disabled={!dirty || saving}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
              <textarea
                ref={editorRef}
                className="code-editor"
                aria-label={`Edit ${selectedFile.name}`}
                value={draft}
                onChange={event => {
                  setDraft(event.target.value)
                  setError('')
                  setFeedback('')
                }}
                onKeyDown={handleEditorKeyDown}
                spellCheck="false"
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                wrap="off"
              />
              <div className="file-editor-footer">
                <span>{draft.split('\n').length} lines</span>
                <span>{formatFileSize(draft)}</span>
              </div>
            </>
          ) : (
            <div className="file-editor-empty">
              <span aria-hidden="true">{'{ }'}</span>
              <p>Select a file to open it in the editor.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
})

export default FileManager
