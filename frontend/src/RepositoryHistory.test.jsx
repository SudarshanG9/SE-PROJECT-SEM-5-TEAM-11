import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import RepositoryHistory from './RepositoryHistory'

const event = { id: 'commit-1', type: 'commit', status: 'success', actorName: 'Carol',
  message: 'Save feature', branchName: 'feature', createdAt: '2026-11-18T10:00:00Z' }
const response = (data, ok = true) => ({ ok, json: async () => data })
beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ events: [event], total: 1 }))))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it('renders identity, timestamp, branch and a safely escaped snapshot', async () => {
  render(<RepositoryHistory repositoryUrl="/api/repositories/one" />)
  expect(await screen.findByText('Save feature')).toBeInTheDocument()
  expect(screen.getByText(/Carol/)).toBeInTheDocument()
  fetch.mockResolvedValueOnce(response({ event: { ...event, code: '<script>secret()</script>' } }))
  fireEvent.click(screen.getByRole('button', { name: 'View snapshot commit-1' }))
  expect(await screen.findByText('<script>secret()</script>')).toBeInTheDocument()
  expect(document.querySelector('script')).toBeNull()
})

it('sends search, type and outcome filters and resets pagination', async () => {
  fetch.mockResolvedValue(response({ events: [event], total: 30 }))
  render(<RepositoryHistory repositoryUrl="/api/repositories/one" />)
  await screen.findByText('Save feature')
  fireEvent.click(screen.getByRole('button', { name: 'Next history page' }))
  await waitFor(() => expect(fetch.mock.lastCall[0]).toContain('offset=25'))
  fireEvent.change(screen.getByLabelText('History type'), { target: { value: 'simulation' } })
  fireEvent.change(screen.getByLabelText('History status'), { target: { value: 'conflicts' } })
  fireEvent.change(screen.getByLabelText('Search history'), { target: { value: 'feature' } })
  await waitFor(() => {
    const url = fetch.mock.lastCall[0]
    expect(url).toContain('offset=0')
    expect(url).toContain('type=simulation')
    expect(url).toContain('status=conflicts')
    expect(url).toContain('q=feature')
  })
})

it('shows an empty state and disables pagination', async () => {
  fetch.mockResolvedValue(response({ events: [], total: 0 }))
  render(<RepositoryHistory repositoryUrl="/api/repositories/one" />)
  expect(await screen.findByText('No history matches these filters.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Next history page' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Previous history page' })).toBeDisabled()
})

it('retries a failed history request', async () => {
  fetch.mockRejectedValueOnce(new Error('Network unavailable'))
  render(<RepositoryHistory repositoryUrl="/api/repositories/one" />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Network unavailable')
  fireEvent.click(screen.getByRole('button', { name: 'Retry history' }))
  expect(await screen.findByText('Save feature')).toBeInTheDocument()
})

it('rejects malformed responses and reports snapshot failures', async () => {
  fetch.mockResolvedValueOnce(response({ events: 'invalid' }))
  render(<RepositoryHistory repositoryUrl="/api/repositories/one" />)
  expect(await screen.findByRole('alert')).toHaveTextContent('invalid response')
  fireEvent.click(screen.getByRole('button', { name: 'Retry history' }))
  await screen.findByText('Save feature')
  fetch.mockResolvedValueOnce(response({ error: 'History event not found.' }, false))
  fireEvent.click(screen.getByRole('button', { name: 'View snapshot commit-1' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('History event not found.')
})

it('displays conflicts and merge ancestry without treating a preview as a commit', async () => {
  fetch.mockResolvedValue(response({ events: [
    { ...event, id: 'preview-1', message: 'Preview feature into main', type: 'simulation',
      status: 'conflicts', sourceName: 'feature', conflictCount: 2 },
    { ...event, id: 'merge-1', message: 'Merge feature into main', type: 'merge',
      parentCommitId: 'target-parent', mergeParentCommitId: 'source-parent' },
  ], total: 2 }))
  render(<RepositoryHistory repositoryUrl="/api/repositories/one" />)
  expect(await screen.findByText('2 conflicts')).toBeInTheDocument()
  expect(screen.getByText('source-parent')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'View snapshot preview-1' })).not.toBeInTheDocument()
})

it('ignores a slow previous repository response', async () => {
  let complete
  fetch.mockImplementationOnce(() => new Promise((resolve) => { complete = resolve }))
  const { rerender } = render(<RepositoryHistory repositoryUrl="/api/repositories/old" />)
  rerender(<RepositoryHistory repositoryUrl="/api/repositories/new" />)
  await screen.findByText('Save feature')
  complete(response({ events: [{ ...event, id: 'old', message: 'Stale history' }], total: 1 }))
  await waitFor(() => expect(screen.queryByText('Stale history')).not.toBeInTheDocument())
})
