import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { createRequire } from 'node:module'
import App from './App'
const { mergeCode } = createRequire(import.meta.url)('../../backend/merge.js')
const fill = (base, a, b) => {
  for (const [label, value] of [['Base', base], ['Branch A', a], ['Branch B', b]]) {
    fireEvent.change(screen.getByLabelText(label), {target: {value}})
  }
}
const click = name => fireEvent.click(screen.getByRole('button', {name}))
const output = () => screen.getByLabelText('Merged code')
async function merge(base = 'a\nkeep\nb', a = 'A\nkeep\nB', b = 'X\nkeep\nY') {
  fill(base, a, b); click('Simulate Merge'); await screen.findByLabelText('Merged code')
}
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (_url, options) => {
    const {base, branchA, branchB} = JSON.parse(options.body)
    const result = mergeCode(base, branchA, branchB)
    return {ok: true, json: async () => ({...result, hasConflict: !!result.conflicts.length})}
  }))
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

it('chooses either branch and stays incomplete until all conflicts are resolved', async () => {
  render(<App />); await merge()
  const first = within(screen.getByRole('article', {name: 'Conflict 1'}))
  const second = within(screen.getByRole('article', {name: 'Conflict 2'}))
  fireEvent.click(second.getByRole('button', {name: 'Use Branch B'}))
  expect(screen.getByText('1 unresolved conflict(s)')).toBeInTheDocument()
  fireEvent.click(first.getByRole('button', {name: 'Use Branch A'}))
  expect(output().textContent).toBe('A\nkeep\nY')
  expect(screen.getByText('All conflicts resolved.')).toBeInTheDocument()
})
it('applies custom text and permits deletion via empty custom text', async () => {
  render(<App />); await merge('a\nkeep', 'A\nkeep', 'X\nkeep')
  fireEvent.change(screen.getByLabelText('Custom resolution for conflict 1'), {target: {value: 'custom\nextra'}})
  click('Apply custom resolution'); expect(output().textContent).toBe('custom\nextra\nkeep')
  fireEvent.change(screen.getByLabelText('Custom resolution for conflict 1'), {target: {value: ''}})
  click('Apply custom resolution'); expect(output().textContent).toBe('keep')
})
it('copies exactly the display and reports success or clipboard failure', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText}})
  render(<App />); await merge('a', 'A', 'a'); click('Copy merged code')
  await screen.findByText('Merged code copied to clipboard.')
  expect(writeText).toHaveBeenCalledWith(output().textContent)
  writeText.mockRejectedValueOnce(new Error('denied')); click('Copy merged code')
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Unable to copy'))
})
it('downloads the exact displayed text and releases its URL', async () => {
  const create = vi.fn().mockReturnValue('blob:test'), revoke = vi.fn()
  vi.stubGlobal('URL', {createObjectURL: create, revokeObjectURL: revoke})
  const linkClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  render(<App />); await merge('a', 'A', 'a'); click('Download merged code')
  expect(linkClick).toHaveBeenCalledOnce()
  const blob = create.mock.calls[0][0]
  const text = await new Promise(resolve => {const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsText(blob)})
  expect(text).toBe(output().textContent)
  await waitFor(() => expect(revoke).toHaveBeenCalledWith('blob:test'))
})
it('confirms reset, preserves canceled work, and permits another merge', async () => {
  render(<App />); await merge('a', 'A', 'a')
  window.confirm.mockReturnValueOnce(false); click(/Clear workspace/)
  expect(output().textContent).toBe('A')
  click(/Clear workspace/)
  expect(screen.getByLabelText('Base')).toHaveValue('')
  expect(screen.queryByLabelText('Merged code')).not.toBeInTheDocument()
  await merge('b', 'b', 'B'); expect(output().textContent).toBe('B')
})
it('invalidates results after input changes', async () => {
  render(<App />); await merge('a', 'A', 'a'); fill('new', 'A', 'a')
  expect(screen.queryByLabelText('Merged code')).not.toBeInTheDocument()
})
it('allows explicitly enabled empty inputs', async () => {
  render(<App />); fireEvent.click(screen.getByLabelText('Allow empty file inputs'))
  await merge('', 'new file', ''); expect(output().textContent).toBe('new file')
})
it('compares empty files and shows additions/removals', () => {
  render(<App />); click('Compare versions')
  expect(screen.getAllByText('Both files are empty.')).toHaveLength(2)
  fill('old', 'new', 'old'); click('Compare versions')
  const region = screen.getByRole('region', {name: 'Version comparisons'})
  expect(region).toHaveTextContent('− old'); expect(region).toHaveTextContent('+ new')
})
it('loads runnable clean and conflicting examples', async () => {
  render(<App />); click('Load non-conflicting example'); click('Simulate Merge')
  await screen.findByText('Successful merge')
  click('Load conflicting example'); click('Simulate Merge')
  await screen.findByText('Conflicts require attention')
})
it('handles non-JSON responses and allows retry', async () => {
  fetch.mockResolvedValueOnce({ok: false, json: async () => { throw new Error('HTML') }})
  render(<App />); fill('a', 'A', 'a'); click('Simulate Merge')
  expect(await screen.findByRole('alert')).toHaveTextContent('invalid response')
  click('Simulate Merge'); await screen.findByText('Successful merge')
})
it('rejects malformed result payloads', async () => {
  fetch.mockResolvedValueOnce({ok: true, json: async () => ({mergedCode: 'x', conflicts: [{}]})})
  render(<App />); fill('a', 'A', 'a'); click('Simulate Merge')
  expect(await screen.findByRole('alert')).toHaveTextContent('invalid result')
})
it('disables editing and duplicate submits during a request', async () => {
  let finish
  fetch.mockImplementationOnce(() => new Promise(resolve => {finish = resolve}))
  render(<App />); fill('a', 'A', 'a'); click('Simulate Merge')
  expect(screen.getByLabelText('Base')).toBeDisabled()
  expect(screen.getByRole('button', {name: 'Processing...'})).toBeDisabled()
  finish({ok: true, json: async () => ({mergedCode: 'A', conflicts: [], message: 'done'})})
  await screen.findByLabelText('Merged code')
  expect(fetch).toHaveBeenCalledTimes(1); expect(screen.getByLabelText('Base')).toBeEnabled()
})
