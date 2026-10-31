import { useEffect, useState } from 'react'
import './RepositoryManager.css'

const API_URL = `${import.meta.env.VITE_API_URL || ''}/api/repositories`

function RepositoryManager() {
  const [repositories, setRepositories] = useState([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [selectedRepository, setSelectedRepository] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')

  async function request(url, options = {}) {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })

    let data = null
    try {
      data = await response.json()
    } catch {
      if (response.ok) {
        return null
      }

      throw new Error('Backend returned an invalid response.')
    }

    if (!response.ok) {
      throw new Error(data?.error || 'Something went wrong. Please try again.')
    }

    return data
  }

  async function loadRepositories() {
    setLoading(true)
    setError('')

    try {
      const data = await request(API_URL)
      setRepositories(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

    useEffect(() => {
    if (import.meta.env.MODE !== 'test') {
      loadRepositories()
    }
  }, [])

  function resetForm() {
    setName('')
    setDescription('')
    setEditingId(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setFeedback('')

    if (!name.trim()) {
      setError('Repository name is required.')
      return
    }

    setSaving(true)

    try {
      if (editingId) {
        await request(`${API_URL}/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify({ name, description }),
        })
        setFeedback('Repository updated successfully.')
      } else {
        await request(API_URL, {
          method: 'POST',
          body: JSON.stringify({ name, description }),
        })
        setFeedback('Repository created successfully.')
      }

      resetForm()
      setSelectedRepository(null)
      await loadRepositories()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleEdit(repository) {
    setEditingId(repository.id)
    setName(repository.name)
    setDescription(repository.description || '')
    setSelectedRepository(null)
    setError('')
    setFeedback('')
  }

  async function handleView(repository) {
    setError('')
    setFeedback('')

    try {
      const data = await request(`${API_URL}/${repository.id}`)
      setSelectedRepository(data)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete(repository) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${repository.name}"? This action cannot be undone.`
    )

    if (!confirmed) return

    setError('')
    setFeedback('')

    try {
      await request(`${API_URL}/${repository.id}`, {
        method: 'DELETE',
      })

      if (selectedRepository?.id === repository.id) {
        setSelectedRepository(null)
      }

      if (editingId === repository.id) {
        resetForm()
      }

      setFeedback('Repository deleted successfully.')
      await loadRepositories()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="repository-section" aria-label="Repository management">
      <div className="repository-heading">
        <div>
          <p className="section-kicker">03 / REPOSITORIES</p>
          <h2>Repository management</h2>
          <p className="section-description">
            Create, view, update and manage your repositories.
          </p>
        </div>

        <span className="repository-count">
          {repositories.length} {repositories.length === 1 ? 'REPOSITORY' : 'REPOSITORIES'}
        </span>
      </div>

      {error && (
        <div className="repository-message repository-error" role="alert">
          {error}
        </div>
      )}

      {feedback && (
        <div className="repository-message repository-success" role="status">
          {feedback}
        </div>
      )}

      <div className="repository-layout">
        <form className="repository-form" onSubmit={handleSubmit}>
          <h3>{editingId ? 'Edit repository' : 'Create a repository'}</h3>

          <label htmlFor="repository-name">Repository name</label>
          <input
            id="repository-name"
            value={name}
            onChange={event => setName(event.target.value)}
            placeholder="e.g. my-project"
            maxLength={100}
            required
          />

          <label htmlFor="repository-description">Description</label>
          <textarea
            id="repository-description"
            value={description}
            onChange={event => setDescription(event.target.value)}
            placeholder="What is this repository about?"
            rows={4}
          />

          <div className="repository-form-actions">
            <button className="repository-primary-button" type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Save changes' : 'Create repository'}
            </button>

            {editingId && (
              <button
                className="repository-secondary-button"
                type="button"
                onClick={resetForm}
                disabled={saving}
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="repository-list-panel">
          <h3>Your repositories</h3>

          {loading ? (
            <p className="repository-empty">Loading repositories...</p>
          ) : repositories.length === 0 ? (
            <p className="repository-empty">
              No repositories yet. Create your first repository using the form.
            </p>
          ) : (
            <div className="repository-list">
              {repositories.map(repository => (
                <article className="repository-item" key={repository.id}>
                  <div className="repository-item-info">
                    <h4>{repository.name}</h4>
                    <p>{repository.description || 'No description provided.'}</p>
                    <span>
                      Created {new Date(repository.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="repository-item-actions">
                    <button
                      type="button"
                      onClick={() => handleView(repository)}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEdit(repository)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="repository-delete-button"
                      onClick={() => handleDelete(repository)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedRepository && (
        <div className="repository-details">
          <div>
            <p className="section-kicker">REPOSITORY DETAILS</p>
            <h3>{selectedRepository.name}</h3>
            <p>{selectedRepository.description || 'No description provided.'}</p>
            <p><strong>ID:</strong> {selectedRepository.id}</p>
            <p>
              <strong>Created:</strong>{' '}
              {new Date(selectedRepository.createdAt).toLocaleString()}
            </p>
            {selectedRepository.updatedAt && (
              <p>
                <strong>Last updated:</strong>{' '}
                {new Date(selectedRepository.updatedAt).toLocaleString()}
              </p>
            )}
          </div>

          <button
            type="button"
            className="repository-secondary-button"
            onClick={() => setSelectedRepository(null)}
          >
            Close details
          </button>
        </div>
      )}
    </section>
  )
}

export default RepositoryManager