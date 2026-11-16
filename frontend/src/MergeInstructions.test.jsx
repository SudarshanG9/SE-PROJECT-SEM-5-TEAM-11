import { afterEach, describe, expect, it } from 'vitest'
import { createRequire } from 'node:module'
import { cleanup, render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import MergeInstructions from './MergeInstructions'

const { mergeCode } = createRequire(import.meta.url)('../../backend/merge.js')

const base = [
  'function greet() {',
  '    console.log("Hello");',
  '}',
  '',
  'function status() {',
  '    console.log("Ready");',
  '}',
].join('\n')

const branchA = [
  'function greet() {',
  '    console.log("Hello");',
  '}',
  '',
  'function welcome() {',
  '    console.log("Welcome");',
  '}',
  '',
  'function status() {',
  '    console.log("Ready");',
  '}',
].join('\n')

const branchB = [
  ...base.split('\n'),
  '',
  'function goodbye() {',
  '    console.log("Goodbye");',
  '}',
].join('\n')

const conflictBase = 'function greet() {\n    console.log("Hello");\n}'
const conflictBranchA = conflictBase.replace('Hello', 'Hello from Branch A')
const conflictBranchB = conflictBase.replace('Hello', 'Hello from Branch B')

afterEach(cleanup)

describe('MergeInstructions', () => {
  it('explains the simulator, all three versions, and the usage steps', () => {
    render(<MergeInstructions />)

    expect(screen.getByRole('heading', { name: 'What does the simulator do?' })).toBeInTheDocument()
    expect(screen.getByText('Base', { selector: 'dt' })).toBeInTheDocument()
    expect(screen.getByText('Branch A', { selector: 'dt' })).toBeInTheDocument()
    expect(screen.getByText('Branch B', { selector: 'dt' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'How to run a merge simulation' })).toBeInTheDocument()
    expect(within(screen.getAllByRole('list')[0]).getAllByRole('listitem')).toHaveLength(9)
    expect(screen.getByRole('heading', { name: 'Understand the result' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Frequently asked questions' })).toBeInTheDocument()
  })

  it('shows the non-conflicting scenario output produced by the merge engine', () => {
    const result = mergeCode(base, branchA, branchB)
    expect(result.conflicts).toEqual([])
    expect(result.message).toBe('Merge completed successfully')

    render(<MergeInstructions />)

    expect(screen.getByRole('heading', { name: 'Non-conflicting changes' })).toBeInTheDocument()
    expect(screen.getByText((_, element) =>
      element?.tagName === 'PRE' && element.textContent === result.mergedCode
    )).toBeInTheDocument()
  })

  it('shows actual conflict output and explains the merge markers', () => {
    const result = mergeCode(conflictBase, conflictBranchA, conflictBranchB)
    expect(result.message).toBe('Merge completed with 1 conflict(s)')
    expect(result.conflicts).toHaveLength(1)
    expect(result.conflicts[0].startLine).toBe(2)

    render(<MergeInstructions />)

    expect(screen.getByRole('heading', { name: 'Conflicting changes' })).toBeInTheDocument()
    expect(screen.getByText((_, element) =>
      element?.tagName === 'PRE' && element.textContent === result.mergedCode
    )).toBeInTheDocument()
    expect(screen.getByText('<<<<<<< BRANCH A', { selector: 'code' })).toBeInTheDocument()
    expect(screen.getByText('=======', { selector: 'code' })).toBeInTheDocument()
    expect(screen.getByText('>>>>>>> BRANCH B', { selector: 'code' })).toBeInTheDocument()
    expect(screen.getByText(/Merge completed with 1 conflict\(s\)/)).toBeInTheDocument()
  })
})
