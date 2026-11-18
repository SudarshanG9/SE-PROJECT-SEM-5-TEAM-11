import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import RepositoryMerge from './RepositoryMerge'

const repositoryUrl = '/api/repositories/repo'
const source = { id: 'feature', name: 'feature', headCommitId: 'source-head' }
const target = { id: 'main', name: 'main', headCommitId: 'target-head', isDefault: true }
const preview = { source, target, mergedCode: 'first line\nsecond line', conflicts: [] }
const respond = (data, ok = true) => ({ ok, json: async () => data })

async function start(role = 'maintainer') {
  render(<RepositoryMerge repositoryUrl={repositoryUrl} session={{ token: 'test', user: { role } }} />)
  fireEvent.change(await screen.findByLabelText('Source branch'), { target: { value: 'feature' } })
  fireEvent.click(screen.getByRole('button', { name: 'Preview merge' }))
  return screen.findByRole('heading', { name: 'Merge preview' })
}

describe('repository merge UI', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(respond({ branches: [target, source] })))
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('previews the exact result, then cancels without saving', async () => {
    fetch.mockResolvedValueOnce(respond(preview))
    expect(await start()).toHaveFocus()
    expect(screen.getByLabelText('Merged code').textContent).toBe(preview.mergedCode)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('heading', { name: 'Merge preview' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Preview merge' })).toHaveFocus()
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('submits the reviewed heads, blocks repeat confirmation, and acknowledges success', async () => {
    let resolveSave
    fetch.mockResolvedValueOnce(respond(preview))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveSave = resolve }))
    await start()
    const confirm = screen.getByRole('button', { name: 'Confirm merge' })
    fireEvent.click(confirm)
    expect(screen.getByRole('status')).toHaveTextContent('Finalizing merge')
    expect(confirm).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    fireEvent.click(confirm)
    expect(fetch).toHaveBeenCalledTimes(3)
    expect(fetch).toHaveBeenLastCalledWith(`${repositoryUrl}/merges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test' },
      body: JSON.stringify({
        sourceBranchId: 'feature', targetBranchId: 'main',
        sourceHeadCommitId: 'source-head', targetHeadCommitId: 'target-head', confirmed: true,
      }),
    })
    resolveSave(respond({ commit: { id: 'merge-commit' }, branch: { name: 'main', headCommitId: 'merge-commit' } }))
    expect(await screen.findByText('merge-commit')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Merge finalized on main')
    expect(screen.queryByRole('button', { name: 'Confirm merge' })).not.toBeInTheDocument()
  })

  it('shows a finalization error and keeps the preview available for retry', async () => {
    fetch.mockResolvedValueOnce(respond(preview))
      .mockResolvedValueOnce(respond({ error: 'A branch changed. Preview the merge again before confirming.' }, false))
    await start()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm merge' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('A branch changed')
    expect(screen.getByLabelText('Merged code')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Preview merge' })).toBeEnabled()
  })

  it.each([
    ['maintainer', [{ id: 1 }], /Resolve the branch conflicts/],
    ['contributor', [], /A maintainer or owner/],
  ])('blocks finalization for %s when approval is unavailable', async (role, conflicts, message) => {
    fetch.mockResolvedValueOnce(respond({ ...preview, conflicts }))
    await start(role)
    expect(screen.getByText(message)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirm merge' })).not.toBeInTheDocument()
  })
})
