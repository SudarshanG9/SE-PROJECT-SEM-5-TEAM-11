import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import CommitManager from './CommitManager'

const branch = { id: 'main', name: 'main', headCommitId: 'head', isDefault: true }
const file = { id: 'file-1', name: 'index.js', content: '<script>saved()</script>' }
const respond = (data, ok = true) => ({ ok, json: async () => data })
const saved = { commit: { id: 'new', files: [{ fileId: file.id, name: file.name, content: file.content }] },
  branch: { ...branch, headCommitId: 'new' } }
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url) => url.endsWith('/branches')
    ? respond({ branches: [branch] }) : respond({ files: [file] })))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

async function open(onCommitted = vi.fn()) {
  render(<CommitManager repositoryUrl="/api/repositories/one"
    session={{ token: 'session-token' }} onCommitted={onCommitted} />)
  fireEvent.click(screen.getByText('Manage commits'))
  await screen.findByLabelText('index.js')
  return onCommitted
}
function select() {
  fireEvent.click(screen.getByLabelText('index.js'))
  fireEvent.change(screen.getByLabelText('File commit message'), { target: { value: ' Save files ' } })
}

it('loads only after opening and requires selected files and a nonblank message', async () => {
  render(<CommitManager repositoryUrl="/api/repositories/one" />)
  expect(fetch).not.toHaveBeenCalled()
  fireEvent.click(screen.getByText('Manage commits'))
  await screen.findByLabelText('index.js')
  expect(screen.getByRole('button', { name: 'Commit selected files' })).toBeDisabled()
  fireEvent.click(screen.getByLabelText('index.js'))
  fireEvent.change(screen.getByLabelText('File commit message'), { target: { value: '   ' } })
  expect(screen.getByRole('button', { name: 'Commit selected files' })).toBeDisabled()
})

it('sends selected IDs, server head and session, then shows safely escaped saved snapshots', async () => {
  const onCommitted = await open()
  select()
  fetch.mockResolvedValueOnce(respond(saved))
  fireEvent.click(screen.getByRole('button', { name: 'Commit selected files' }))
  expect(await screen.findByText('Commit saved:', { exact: false })).toBeInTheDocument()
  expect(fetch.mock.lastCall).toEqual(['/api/repositories/one/commits', expect.objectContaining({
    method: 'POST', headers: expect.objectContaining({ Authorization: 'Bearer session-token' }),
    body: JSON.stringify({ branchId: 'main', message: 'Save files', fileIds: ['file-1'], expectedHeadCommitId: 'head' }),
  })])
  expect(screen.getByText(file.content)).toBeInTheDocument()
  expect(document.querySelector('script')).toBeNull()
  expect(onCommitted).toHaveBeenCalledOnce()
  expect(screen.getByLabelText('File commit message')).toHaveValue('')
  select()
  fetch.mockResolvedValueOnce(respond(saved))
  fireEvent.click(screen.getByRole('button', { name: 'Commit selected files' }))
  await waitFor(() => expect(JSON.parse(fetch.mock.lastCall[1].body).expectedHeadCommitId).toBe('new'))
})

it('prevents repeat submission and editing while a save is pending', async () => {
  await open()
  select()
  let finish
  fetch.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
  const submit = screen.getByRole('button', { name: 'Commit selected files' })
  fireEvent.click(submit)
  fireEvent.click(submit)
  expect(fetch.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(1)
  expect(screen.getByLabelText('Commit branch')).toBeDisabled()
  expect(screen.getByLabelText('File commit message')).toBeDisabled()
  finish(respond(saved))
  await screen.findByText('Commit saved:', { exact: false })
})

it('preserves draft and selection after a rejected save and refreshes a stale head', async () => {
  await open()
  select()
  fetch.mockResolvedValueOnce(respond({ error: 'The branch changed. Refresh before saving your commit.' }, false))
  fireEvent.click(screen.getByRole('button', { name: 'Commit selected files' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('The branch changed')
  expect(screen.getByLabelText('File commit message')).toHaveValue(' Save files ')
  expect(screen.getByLabelText('index.js')).toBeChecked()
  fireEvent.click(screen.getByRole('button', { name: 'Refresh commit files' }))
  await screen.findByLabelText('index.js')
  expect(screen.getByLabelText('index.js')).not.toBeChecked()
})

it('handles load errors and an empty file list', async () => {
  fetch.mockRejectedValueOnce(new Error('Cannot load files'))
  render(<CommitManager repositoryUrl="/api/repositories/one" />)
  fireEvent.click(screen.getByText('Manage commits'))
  expect(await screen.findByRole('alert')).toHaveTextContent('Cannot load files')
  fetch.mockImplementation(async (url) => url.endsWith('/branches')
    ? respond({ branches: [] }) : respond({ files: [] }))
  fireEvent.click(screen.getByRole('button', { name: 'Refresh commit files' }))
  expect(await screen.findByText('No files available. Create a file first.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Commit selected files' })).toBeDisabled()
})

it('rejects an incomplete save acknowledgement instead of reporting success', async () => {
  const onCommitted = await open()
  select()
  fetch.mockResolvedValueOnce(respond({ commit: { id: 'new' } }))
  fireEvent.click(screen.getByRole('button', { name: 'Commit selected files' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('did not acknowledge')
  expect(onCommitted).not.toHaveBeenCalled()
})
