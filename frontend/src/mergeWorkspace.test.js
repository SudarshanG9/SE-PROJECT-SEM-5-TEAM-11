import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
import { compareLines, resolveOutput } from './mergeWorkspace'
const { mergeCode } = createRequire(import.meta.url)('../../backend/merge.js')

describe('comparison', () => {
  it('identifies inserted/deleted lines with source numbers', () => {
    expect(compareLines('a\nb', 'a\nc').lines).toEqual([
      { kind: 'unchanged', text: 'a', oldLine: 1, newLine: 1 },
      { kind: 'removed', text: 'b', oldLine: 2, newLine: '' },
      { kind: 'added', text: 'c', oldLine: '', newLine: 2 },
    ])
  })
  it('handles empty and whitespace-only files', () => {
    expect(compareLines('', '').lines).toEqual([])
    expect(compareLines('', ' ').lines[0]).toMatchObject({kind: 'added', text: ' '})
    expect(compareLines('a', '').lines[0].kind).toBe('removed')
  })
  it('limits large comparisons', () => {
    expect(compareLines('x\n'.repeat(1500), 'y\n'.repeat(1500)).error).toContain('too large')
  })
})

describe('resolution using real engine metadata', () => {
  it('resolves multiple conflicts out of order without losing untouched text', () => {
    const result = mergeCode('a\nkeep\nb', 'A\nkeep\nB', 'X\nkeep\nY')
    expect(resolveOutput(result, { 2: ['custom', 'more'] })).toContain('>>>>>>> BRANCH B\nkeep\ncustom\nmore')
    expect(resolveOutput(result, { 1: ['A'], 2: ['custom', 'more'] })).toBe('A\nkeep\ncustom\nmore')
  })
  it('resolves deletions without an extra blank line', () => {
    const result = mergeCode('a\nb', 'b', 'A\nb')
    expect(resolveOutput(result, { 1: result.conflicts[0].branchALines })).toBe('b')
  })
  it('preserves marker-like source content', () => {
    const result = mergeCode('a', '<<<<<<< BRANCH A\nliteral', 'right')
    expect(resolveOutput(result, { 1: result.conflicts[0].branchALines })).toBe('<<<<<<< BRANCH A\nliteral')
  })
})
