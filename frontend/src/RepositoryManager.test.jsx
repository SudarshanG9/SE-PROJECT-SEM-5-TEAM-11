
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import RepositoryManager from './RepositoryManager'

const mockRepositories = [
  {
    id: '1',
    name: 'Alpha',
    description: 'Frontend application',
    createdAt: '2026-01-01T10:00:00Z',
  },
  {
    id: '2',
    name: 'Bravo',
    description: '',
    createdAt: '2026-03-01T10:00:00Z',
  },
  {
    id: '3',
    name: 'Charlie',
    description: 'Backend application',
    createdAt: '2026-02-01T10:00:00Z',
  },
]

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        repositories: mockRepositories,
      }),
    })
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('RepositoryManager', () => {
  it('displays repository dashboard statistics', async () => {
    render(<RepositoryManager />)

    await screen.findByRole('heading', { name: 'Alpha' })

    expect(screen.getByText('Total repositories').parentElement)
      .toHaveTextContent('3')

    expect(screen.getByText('With descriptions').parentElement)
      .toHaveTextContent('2')

    expect(screen.getByText('Without descriptions').parentElement)
      .toHaveTextContent('1')
  })

  it('filters repositories by name', async () => {
    render(<RepositoryManager />)

    await screen.findByRole('heading', { name: 'Alpha' })

    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'Bravo' },
    })

    expect(screen.getByRole('heading', { name: 'Bravo' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Alpha' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Charlie' })).not.toBeInTheDocument()
  })

  it('filters repositories by description', async () => {
    render(<RepositoryManager />)

    await screen.findByRole('heading', { name: 'Alpha' })

    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'Backend' },
    })

    expect(screen.getByRole('heading', { name: 'Charlie' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Alpha' })).not.toBeInTheDocument()
  })

  it('displays a message when no repositories match the search', async () => {
    render(<RepositoryManager />)

    await screen.findByRole('heading', { name: 'Alpha' })

    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'Nonexistent' },
    })

    expect(
      screen.getByText('No repositories match your search.')
    ).toBeInTheDocument()
  })

  it('sorts repositories alphabetically', async () => {
    render(<RepositoryManager />)

    await screen.findByRole('heading', { name: 'Alpha' })

    fireEvent.change(screen.getByLabelText('Sort repositories'), {
      target: { value: 'name' },
    })

    const headings = screen.getAllByRole('heading', { level: 4 })

    expect(headings.map((heading) => heading.textContent)).toEqual([
      'Alpha',
      'Bravo',
      'Charlie',
    ])
  })

  it('sorts repositories by oldest first', async () => {
    render(<RepositoryManager />)

    await screen.findByRole('heading', { name: 'Alpha' })

    fireEvent.change(screen.getByLabelText('Sort repositories'), {
      target: { value: 'oldest' },
    })

    const headings = screen.getAllByRole('heading', { level: 4 })

    expect(headings.map((heading) => heading.textContent)).toEqual([
      'Alpha',
      'Charlie',
      'Bravo',
    ])
  })

  it('sorts repositories by newest first by default', async () => {
    render(<RepositoryManager />)

    await screen.findByRole('heading', { name: 'Alpha' })

    const headings = screen.getAllByRole('heading', { level: 4 })

    expect(headings.map((heading) => heading.textContent)).toEqual([
      'Bravo',
      'Charlie',
      'Alpha',
    ])
  })
})
