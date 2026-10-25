// Pure helpers keep comparisons and resolution independent of React state.
export function compareLines(base, branch) {
  const a = base === '' ? [] : base.split('\n')
  const b = branch === '' ? [] : branch.split('\n')
  if ((a.length + 1) * (b.length + 1) > 2_000_000) {
    return { error: 'Comparison is too large. Use smaller code snippets.', lines: [] }
  }
  const dp = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1))
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const lines = []
  let i = 0, j = 0
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      lines.push({ kind: 'unchanged', text: a[i], oldLine: ++i, newLine: ++j })
    } else if (j < b.length && (i === a.length || dp[i][j + 1] > dp[i + 1][j])) {
      lines.push({ kind: 'added', text: b[j], oldLine: '', newLine: ++j })
    } else {
      lines.push({ kind: 'removed', text: a[i], oldLine: ++i, newLine: '' })
    }
  }
  return { lines }
}

export function resolveOutput(result, resolutions) {
  const lines = result.mergedCode.split('\n')
  // Offsets refer to the original response; apply backwards so earlier offsets stay valid.
  for (const conflict of [...result.conflicts].reverse()) {
    if (!Object.hasOwn(resolutions, conflict.id)) continue
    const replacement = resolutions[conflict.id]
    lines.splice(conflict.outputStartLine - 1,
      conflict.outputEndLine - conflict.outputStartLine + 1, ...replacement)
  }
  return lines.join('\n')
}

export const examples = {
  clean: { base: 'const color = "blue";\nconst size = 1;', branchA: 'const color = "green";\nconst size = 1;', branchB: 'const color = "blue";\nconst size = 2;' },
  conflict: { base: 'const color = "blue";', branchA: 'const color = "green";', branchB: 'const color = "red";' },
}
