import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import App from './App'

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('renders merge editor inputs and action buttons', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Enter Code Versions' })).toBeInTheDocument()
    expect(screen.getByLabelText('Base Version')).toBeInTheDocument()
    expect(screen.getByLabelText('Branch A Version')).toBeInTheDocument()
    expect(screen.getByLabelText('Branch B Version')).toBeInTheDocument()
    expect(screen.getByText('The original source code before branching.')).toBeInTheDocument()
    expect(screen.getByText("Contains the first branch's modifications.")).toBeInTheDocument()
    expect(screen.getByText("Contains the second branch's modifications.")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Simulate Merge' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear All' })).toBeInTheDocument()
  })

  it('keeps multiline edits in each version independent', () => {
    render(<App />)

    const base = screen.getByLabelText('Base Version')
    const branchA = screen.getByLabelText('Branch A Version')
    const branchB = screen.getByLabelText('Branch B Version')
    const baseCode = 'function base() {\n  return 1;\n}'
    const branchACode = 'function branchA() {\n  return 2;\n}'
    const branchBCode = 'function branchB() {\n  return 3;\n}'

    fireEvent.change(base, { target: { value: baseCode } })
    expect(base).toHaveValue(baseCode)
    expect(branchA).toHaveValue('')
    expect(branchB).toHaveValue('')

    fireEvent.change(branchA, { target: { value: branchACode } })
    expect(base).toHaveValue(baseCode)
    expect(branchA).toHaveValue(branchACode)
    expect(branchB).toHaveValue('')

    fireEvent.change(branchB, { target: { value: branchBCode } })
    expect(base).toHaveValue(baseCode)
    expect(branchA).toHaveValue(branchACode)
    expect(branchB).toHaveValue(branchBCode)
  })

  it('validates missing code versions without calling the merge API', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Simulate Merge' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Enter code in Base Version, Branch A Version, and Branch B Version before simulating a merge.'
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it('clears all independently managed code versions', () => {
    render(<App />)

    fireEvent.change(screen.getByLabelText('Base Version'), { target: { value: 'base' } })
    fireEvent.change(screen.getByLabelText('Branch A Version'), { target: { value: 'branch a' } })
    fireEvent.change(screen.getByLabelText('Branch B Version'), { target: { value: 'branch b' } })
    fireEvent.click(screen.getByRole('button', { name: 'Clear All' }))

    expect(screen.getByLabelText('Base Version')).toHaveValue('')
    expect(screen.getByLabelText('Branch A Version')).toHaveValue('')
    expect(screen.getByLabelText('Branch B Version')).toHaveValue('')
  })

  it('submits merge request and displays merged output', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        mergedCode: 'const value = 2;',
        hasConflict: false,
        message: 'Merge completed successfully',
        conflicts: [],
      }),
    })

    render(<App />)
    fireEvent.change(screen.getByLabelText('Base Version'), { target: { value: 'const value = 1;' } })
    fireEvent.change(screen.getByLabelText('Branch A Version'), { target: { value: 'const value = 2;' } })
    fireEvent.change(screen.getByLabelText('Branch B Version'), { target: { value: 'const value = 3;' } })
    fireEvent.click(screen.getByRole('button', { name: 'Simulate Merge' }))

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    expect(fetch).toHaveBeenCalledWith('/api/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base: 'const value = 1;',
        branchA: 'const value = 2;',
        branchB: 'const value = 3;',
      }),
    })
    expect(await screen.findByText('Merge completed successfully')).toBeInTheDocument()
    expect(screen.getByText('const value = 2;', { selector: 'pre' })).toBeInTheDocument()
  })

  it('shows backend error messages when merge endpoint fails', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Base, Branch A, and Branch B must be provided.' }),
    })

    render(<App />)
    fireEvent.change(screen.getByLabelText('Base Version'), { target: { value: 'base' } })
    fireEvent.change(screen.getByLabelText('Branch A Version'), { target: { value: 'branch a' } })
    fireEvent.change(screen.getByLabelText('Branch B Version'), { target: { value: 'branch b' } })
    fireEvent.click(screen.getByRole('button', { name: 'Simulate Merge' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Base, Branch A, and Branch B must be provided.'
    )
  })

  it('shows connection message when backend is unreachable', async () => {
    fetch.mockRejectedValueOnce(new Error('Failed to fetch'))

    render(<App />)
    fireEvent.change(screen.getByLabelText('Base Version'), { target: { value: 'base' } })
    fireEvent.change(screen.getByLabelText('Branch A Version'), { target: { value: 'branch a' } })
    fireEvent.change(screen.getByLabelText('Branch B Version'), { target: { value: 'branch b' } })
    fireEvent.click(screen.getByRole('button', { name: 'Simulate Merge' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not reach the backend. Make sure the server is running on port 3000.'
    )
  })

  it('displays the actual conflict result returned by the merge API', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        mergedCode: '<<<<<<< BRANCH A\nleft\n=======\nright\n>>>>>>> BRANCH B',
        hasConflict: true,
        message: 'Merge completed with 1 conflict(s)',
        conflicts: [{
          id: 1,
          startLine: 1,
          endLine: 1,
          base: 'original',
          branchA: 'left',
          branchB: 'right',
        }],
      }),
    })

    render(<App />)
    fireEvent.change(screen.getByLabelText('Base Version'), { target: { value: 'original' } })
    fireEvent.change(screen.getByLabelText('Branch A Version'), { target: { value: 'left' } })
    fireEvent.change(screen.getByLabelText('Branch B Version'), { target: { value: 'right' } })
    fireEvent.click(screen.getByRole('button', { name: 'Simulate Merge' }))

    expect(await screen.findByText('Merge completed with 1 conflict(s)')).toBeInTheDocument()
    expect(screen.getByText('⚠ 1 conflict detected')).toBeInTheDocument()
    const mergedCode = '<<<<<<< BRANCH A\nleft\n=======\nright\n>>>>>>> BRANCH B'
    expect(await screen.findByText((_, element) =>
      element?.tagName === 'PRE' && element.textContent === mergedCode
    )).toBeInTheDocument()
    expect(screen.getByText('left', { selector: '.side-a pre' })).toBeInTheDocument()
    expect(screen.getByText('right', { selector: '.side-b pre' })).toBeInTheDocument()
  })

  it('shows an error when the merge API returns an incomplete result', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ hasConflict: false, conflicts: [] }),
    })

    render(<App />)
    fireEvent.change(screen.getByLabelText('Base Version'), { target: { value: 'base' } })
    fireEvent.change(screen.getByLabelText('Branch A Version'), { target: { value: 'branch a' } })
    fireEvent.change(screen.getByLabelText('Branch B Version'), { target: { value: 'branch b' } })
    fireEvent.click(screen.getByRole('button', { name: 'Simulate Merge' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The merge service returned an incomplete result.'
    )
  })

  it('shows an error when the merge API response is not valid JSON', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => { throw new SyntaxError('Invalid JSON') },
    })

    render(<App />)
    fireEvent.change(screen.getByLabelText('Base Version'), { target: { value: 'base' } })
    fireEvent.change(screen.getByLabelText('Branch A Version'), { target: { value: 'branch a' } })
    fireEvent.change(screen.getByLabelText('Branch B Version'), { target: { value: 'branch b' } })
    fireEvent.click(screen.getByRole('button', { name: 'Simulate Merge' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The merge service returned an invalid response.'
    )
  })
})
