import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import FileManager from './FileManager'

const filesUrl = '/api/repositories/repo-1/files'
const originalFile = {
  id: 'file-1',
  repositoryId: 'repo-1',
  name: 'index.js',
  content: 'const value = 1;',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function response(payload, { ok = true, status = 200 } = {}) {
  return { ok, status, json: vi.fn().mockResolvedValue(payload) }
}

function mockFileApi({ files = [originalFile] } = {}) {
  fetch.mockImplementation(async (url, options = {}) => {
    if (url === filesUrl && !options.method) return response({ files })
    if (url === `${filesUrl}/${originalFile.id}` && !options.method) {
      return response({ file: originalFile })
    }
    if (url === `${filesUrl}/${originalFile.id}` && options.method === 'PUT') {
      return response({ file: { ...originalFile, ...JSON.parse(options.body) } })
    }
    if (url === filesUrl && options.method === 'POST') {
      const body = JSON.parse(options.body)
      return response({
        file: { ...body, id: 'file-new', repositoryId: 'repo-1' },
      }, { status: 201 })
    }
    if (url === `${filesUrl}/${originalFile.id}` && options.method === 'DELETE') {
      return response({ message: 'File deleted successfully.' })
    }
    return response({ error: `Unexpected request: ${options.method || 'GET'} ${url}` }, {
      ok: false,
      status: 500,
    })
  })
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('repository file management', () => {
  it('lists files with language and size information', async () => {
    mockFileApi()
    render(<FileManager repositoryId="repo-1" />)

    expect(await screen.findByText('index.js')).toBeInTheDocument()
    expect(screen.getByText(/JavaScript ·/)).toBeInTheDocument()
  })

  it('shows an empty state when the repository has no files', async () => {
    fetch.mockResolvedValueOnce(response({ files: [] }))
    render(<FileManager repositoryId="repo-1" />)
    expect(await screen.findByText(/This repository has no files yet/)).toBeInTheDocument()
  })

  it('opens a file, edits it, and saves through the existing API', async () => {
    mockFileApi()
    render(<FileManager repositoryId="repo-1" />)

    fireEvent.click(await screen.findByRole('button', { name: 'Open index.js' }))
    const editor = await screen.findByRole('textbox', { name: 'Edit index.js' })
    fireEvent.change(editor, { target: { value: 'const value = 2;' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await screen.findByRole('status')
    expect(fetch).toHaveBeenCalledWith(`${filesUrl}/${originalFile.id}`, expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ content: 'const value = 2;' }),
    }))
    expect(screen.getByRole('textbox', { name: 'Edit index.js' })).toHaveValue('const value = 2;')
    expect(screen.getByText('File saved successfully.')).toBeInTheDocument()
  })

  it('saves dirty edits before switching files', async () => {
    const secondFile = { ...originalFile, id: 'file-2', name: 'main.py', content: 'print(1)' }
    mockFileApi({ files: [originalFile, secondFile] })
    fetch.mockImplementation(async (url, options = {}) => {
      if (url === filesUrl && !options.method) return response({ files: [originalFile, secondFile] })
      if (url === `${filesUrl}/${originalFile.id}` && !options.method) return response({ file: originalFile })
      if (url === `${filesUrl}/${originalFile.id}` && options.method === 'PUT') {
        return response({ file: { ...originalFile, ...JSON.parse(options.body) } })
      }
      if (url === `${filesUrl}/file-2` && !options.method) return response({ file: secondFile })
      return response({ error: 'Unexpected request' }, { ok: false, status: 500 })
    })
    render(<FileManager repositoryId="repo-1" />)

    fireEvent.click(await screen.findByRole('button', { name: 'Open index.js' }))
    fireEvent.change(await screen.findByRole('textbox', { name: 'Edit index.js' }), {
      target: { value: 'const value = 9;' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Open main.py' }))

    expect(window.confirm).toHaveBeenCalledWith(
      'This file has unsaved changes. Save them before leaving?'
    )
    expect(await screen.findByRole('textbox', { name: 'Edit main.py' })).toHaveValue('print(1)')
    expect(fetch).toHaveBeenCalledWith(`${filesUrl}/${originalFile.id}`, expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ content: 'const value = 9;' }),
    }))
  })

  it('creates a file through the API', async () => {
    mockFileApi({ files: [] })
    render(<FileManager repositoryId="repo-1" />)

    fireEvent.click(await screen.findByRole('button', { name: 'New file' }))
    fireEvent.change(screen.getByLabelText('Filename'), { target: { value: 'notes.txt' } })
    fireEvent.change(screen.getByLabelText('Initial content'), { target: { value: 'hello' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create file' }))

    expect(await screen.findByText('notes.txt')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith(filesUrl, expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ name: 'notes.txt', content: 'hello' }),
    }))
  })

  it('rejects duplicate names without sending a create request', async () => {
    mockFileApi()
    render(<FileManager repositoryId="repo-1" />)

    fireEvent.click(await screen.findByRole('button', { name: 'New file' }))
    fireEvent.change(screen.getByLabelText('Filename'), { target: { value: 'INDEX.JS' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create file' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A file with this name already exists in this repository.'
    )
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('validates upload type and size before reading or uploading', async () => {
    mockFileApi({ files: [] })
    render(<FileManager repositoryId="repo-1" />)
    const input = await screen.findByLabelText('Upload text or code file')

    fireEvent.change(input, {
      target: { files: [new File(['binary'], 'application.exe')] },
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a supported text or code file.')

    fireEvent.change(input, {
      target: { files: [new File(['x'.repeat(1024 * 1024 + 1)], 'large.js')] },
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('Files must be 1 MB or smaller.')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('uploads supported text files with their content', async () => {
    mockFileApi({ files: [] })
    render(<FileManager repositoryId="repo-1" />)
    const input = await screen.findByLabelText('Upload text or code file')

    fireEvent.change(input, {
      target: { files: [new File(['print("hello")'], 'main.py', { type: 'text/plain' })] },
    })

    expect(await screen.findByText('main.py')).toBeInTheDocument()
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(filesUrl, expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'main.py', content: 'print("hello")' }),
      }))
    })
    expect(screen.getByRole('status')).toHaveTextContent('main.py uploaded successfully.')
  })

  it('confirms deletion and removes the file after the API succeeds', async () => {
    mockFileApi()
    render(<FileManager repositoryId="repo-1" />)

    fireEvent.click(await screen.findByRole('button', { name: 'Delete index.js' }))

    await waitFor(() => expect(screen.queryByText('index.js')).not.toBeInTheDocument())
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Delete "index.js"?'))
    expect(fetch).toHaveBeenCalledWith(`${filesUrl}/${originalFile.id}`, expect.objectContaining({
      method: 'DELETE',
    }))
  })

  it('displays API errors for listing and deletion', async () => {
    fetch.mockResolvedValueOnce(response({ error: 'List unavailable' }, { ok: false, status: 503 }))
    render(<FileManager repositoryId="repo-1" />)
    expect(await screen.findByRole('alert')).toHaveTextContent('List unavailable')

    mockFileApi()
    cleanup()
    render(<FileManager repositoryId="repo-1" />)
    await screen.findByRole('button', { name: 'Delete index.js' })
    fetch.mockImplementationOnce(async () =>
      response({ error: 'Delete unavailable' }, { ok: false, status: 503 })
    )
    fireEvent.click(screen.getByRole('button', { name: 'Delete index.js' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Delete unavailable')
    expect(screen.getByText('index.js')).toBeInTheDocument()
  })
})
