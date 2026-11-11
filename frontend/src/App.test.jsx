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

    expect(screen.getByLabelText('Base')).toBeInTheDocument()
    expect(screen.getByLabelText('Branch A')).toBeInTheDocument()
    expect(screen.getByLabelText('Branch B')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Simulate Merge' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear All' })).toBeInTheDocument()
  })

  it('opens the user guide and preserves simulator code when returning', () => {
    const { container } = render(<App />)
    const baseInput = screen.getByLabelText('Base')
    fireEvent.change(baseInput, { target: { value: 'function retained() {}' } })

    fireEvent.click(screen.getByRole('button', { name: 'User Guide' }))
    expect(screen.getByRole('heading', { name: 'How to use the merge simulator' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'User Guide' })).toHaveAttribute('aria-current', 'page')
    expect(baseInput).toHaveValue('function retained() {}')

    fireEvent.click(screen.getByRole('button', { name: 'Merge Simulator' }))
    expect(screen.getByLabelText('Base')).toBeVisible()
    expect(container.querySelector('#base')).toHaveValue('function retained() {}')
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
    fireEvent.change(screen.getByLabelText('Base'), { target: { value: 'const value = 1;' } })
    fireEvent.change(screen.getByLabelText('Branch A'), { target: { value: 'const value = 2;' } })
    fireEvent.change(screen.getByLabelText('Branch B'), { target: { value: 'const value = 3;' } })
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
    fireEvent.click(screen.getByRole('button', { name: 'Simulate Merge' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Base, Branch A, and Branch B must be provided.'
    )
  })

  it('shows connection message when backend is unreachable', async () => {
    fetch.mockRejectedValueOnce(new Error('Failed to fetch'))

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Simulate Merge' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not reach the backend. Make sure the server is running on port 3000.'
    )
  })
})
