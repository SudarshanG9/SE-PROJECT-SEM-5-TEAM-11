
function mergeCode(base, branchA, branchB) {
  if (
    typeof base !== "string" ||
    typeof branchA !== "string" ||
    typeof branchB !== "string"
  ) {
    throw new TypeError(
      "base, branchA, and branchB must be strings"
    );
  }

  // If both branches are identical, no merge is needed.
  if (branchA === branchB) {
    return {
      mergedCode: branchA,
      conflicts: [],
      message: "Merge completed successfully",
    };
  }

  // If only one branch changed, use that branch.
  if (branchA === base) {
    return {
      mergedCode: branchB,
      conflicts: [],
      message: "Merge completed successfully",
    };
  }

  if (branchB === base) {
    return {
      mergedCode: branchA,
      conflicts: [],
      message: "Merge completed successfully",
    };
  }

  const baseLines = base === "" ? [] : base.split("\n");
  const aLines = branchA === "" ? [] : branchA.split("\n");
  const bLines = branchB === "" ? [] : branchB.split("\n");

  // Find the changes each branch made relative to base.
  function getChanges(original, modified) {
    const n = original.length;
    const m = modified.length;

    // Bound the quadratic LCS allocation for interactive use.
    if ((n + 1) * (m + 1) > 2_000_000) {
      throw new RangeError("Input is too large to compare. Use smaller code snippets.");
    }

    // LCS table: longest common subsequence.
    const dp = Array.from(
      { length: n + 1 },
      () => Array(m + 1).fill(0)
    );

    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i][j] =
          original[i] === modified[j]
            ? 1 + dp[i + 1][j + 1]
            : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }

    const changes = [];
    let i = 0;
    let j = 0;
    let start = null;
    let end = null;
    let replacement = [];

    function flush() {
      if (start !== null) {
        changes.push({
          start,
          end,
          replacement,
        });
      }
      start = null;
      end = null;
      replacement = [];
    }

    while (i < n || j < m) {
      if (
        i < n &&
        j < m &&
        original[i] === modified[j]
      ) {
        flush();
        i++;
        j++;
      } else {
        if (start === null) {
          start = i;
          end = i;
        }

        if (
          j < m &&
          (i === n || dp[i][j + 1] > dp[i + 1][j])
        ) {
          replacement.push(modified[j]);
          j++;
        } else if (i < n) {
          i++;
          end = i;
        } else {
          replacement.push(modified[j]);
          j++;
        }
      }
    }

    flush();
    return changes;
  }

  const changesA = getChanges(baseLines, aLines);
  const changesB = getChanges(baseLines, bLines);

  // Check whether two changes overlap in the base.
  function overlaps(a, b) {
    const aInsertion = a.start === a.end;
    const bInsertion = b.start === b.end;

    if (aInsertion && bInsertion) {
      return a.start === b.start;
    }

    if (aInsertion) {
      return a.start > b.start && a.start < b.end;
    }

    if (bInsertion) {
      return b.start > a.start && b.start < a.end;
    }

    return a.start < b.end && b.start < a.end;
  }

  // Combine changes from both branches.
  const allChanges = [
    ...changesA.map((change) => ({ ...change, source: "A" })),
    ...changesB.map((change) => ({ ...change, source: "B" })),
  ].sort(
    (a, b) =>
      a.start - b.start ||
      a.end - b.end ||
      a.source.localeCompare(b.source)
  );

  const mergedChanges = [];
  const conflicts = [];

  for (const change of allChanges) {
    const previous = mergedChanges[mergedChanges.length - 1];

    if (!previous || !overlaps(previous, change)) {
      mergedChanges.push({ ...change });
      continue;
    }

    // Identical edits from both branches are not conflicts.
    if (
      previous.start === change.start &&
      previous.end === change.end &&
      previous.replacement.join("\n") ===
        change.replacement.join("\n")
    ) {
      continue;
    }

    // Expand overlapping edits into one conflict region.
    const start = Math.min(previous.start, change.start);
    const end = Math.max(previous.end, change.end);

    const baseSection = baseLines.slice(start, end);

    function applyRegionChanges(source) {
      const sourceChanges = allChanges
        .filter(
          (item) =>
            item.source === source &&
            item.start >= start &&
            item.end <= end &&
            (item.start !== item.end || start === end || (item.start > start && item.start < end))
        )
        .sort((a, b) => a.start - b.start || a.end - b.end);

      const result = [];
      let cursor = start;

      for (const item of sourceChanges) {
        result.push(...baseLines.slice(cursor, item.start));
        result.push(...item.replacement);
        cursor = item.end;
      }

      result.push(...baseLines.slice(cursor, end));
      return result;
    }

    const resultA = applyRegionChanges("A");
    const resultB = applyRegionChanges("B");

    // A previous conflict can be extended by another overlapping edit.
    const existingConflict = conflicts.find(
      (item) => item.start === start
    );

    if (existingConflict) {
      existingConflict.end = end;
      existingConflict.base = baseLines.slice(start, end);
      existingConflict.branchA = resultA;
      existingConflict.branchB = resultB;
    } else {
      conflicts.push({
        start,
        end,
        base: baseSection,
        branchA: resultA,
        branchB: resultB,
      });
    }

    mergedChanges[mergedChanges.length - 1] = {
      start,
      end,
      replacement: [
        "<<<<<<< BRANCH A",
        ...resultA,
        "=======",
        ...resultB,
        ">>>>>>> BRANCH B",
      ],
      source: "conflict",
    };
  }

  // Apply merged edits to the base from top to bottom.
  const output = [];
  let cursor = 0;

  for (const change of mergedChanges) {
    output.push(...baseLines.slice(cursor, change.start));
    const conflict = conflicts.find((item) => item.start === change.start && change.source === "conflict");
    if (conflict) {
      conflict.outputStartLine = output.length + 1;
      conflict.outputEndLine = output.length + change.replacement.length;
    }
    output.push(...change.replacement);
    cursor = change.end;
  }

  output.push(...baseLines.slice(cursor));

  return {
    mergedCode: output.join("\n"),
    conflicts: conflicts.map((conflict, index) => ({
      id: index + 1,
      startLine: conflict.start + 1,
      endLine: Math.max(conflict.start + 1, conflict.end),
      outputStartLine: conflict.outputStartLine,
      outputEndLine: conflict.outputEndLine,
      branchALines: conflict.branchA,
      branchBLines: conflict.branchB,
      base: conflict.base.join("\n"),
      branchA: conflict.branchA.join("\n"),
      branchB: conflict.branchB.join("\n"),
    })),
    message:
      conflicts.length > 0
        ? `Merge completed with ${conflicts.length} conflict(s)`
        : "Merge completed successfully",
  };
}

module.exports = { mergeCode };

