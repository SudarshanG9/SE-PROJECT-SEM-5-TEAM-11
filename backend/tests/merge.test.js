import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { mergeCode } = require("../merge.js");

describe("mergeCode", () => {
  it("returns the original code when neither branch changes", () => {
    const base = "const x = 1;";

    const result = mergeCode(base, base, base);

    expect(result.mergedCode).toBe(base);
    expect(result.conflicts).toEqual([]);
    expect(result.message).toBe("Merge completed successfully");
  });

  it("uses Branch A when only Branch A changes", () => {
    const result = mergeCode(
      "const x = 1;",
      "const x = 2;",
      "const x = 1;"
    );

    expect(result.mergedCode).toBe("const x = 2;");
    expect(result.conflicts).toEqual([]);
  });

  it("uses Branch B when only Branch B changes", () => {
    const result = mergeCode(
      "const x = 1;",
      "const x = 1;",
      "const x = 3;"
    );

    expect(result.mergedCode).toBe("const x = 3;");
    expect(result.conflicts).toEqual([]);
  });

  it("combines changes on different lines", () => {
    const result = mergeCode(
      "const a = 1;\nconst b = 2;",
      "const a = 10;\nconst b = 2;",
      "const a = 1;\nconst b = 20;"
    );

    expect(result.mergedCode).toBe(
      "const a = 10;\nconst b = 20;"
    );
    expect(result.conflicts).toEqual([]);
  });

  it("reports a conflict when both branches change the same line", () => {
    const result = mergeCode(
      "const x = 1;",
      "const x = 2;",
      "const x = 3;"
    );

    expect(result.conflicts.length).toBeGreaterThan(0);
    expect(result.mergedCode).toContain("<<<<<<< BRANCH A");
    expect(result.mergedCode).toContain("=======");
    expect(result.mergedCode).toContain(">>>>>>> BRANCH B");
    expect(result.message).toContain("conflict");
  });

  it("does not report a conflict when both branches make the same change", () => {
    const result = mergeCode(
      "const x = 1;",
      "const x = 2;",
      "const x = 2;"
    );

    expect(result.mergedCode).toBe("const x = 2;");
    expect(result.conflicts).toEqual([]);
  });

  it("rejects inputs that are not strings", () => {
    expect(() => mergeCode(null, "a", "b")).toThrow(TypeError);
  });
});


describe('merge boundaries and resolution metadata', () => {
  it('combines insertion before a line with an edit to that line', () => {
    const result = mergeCode('x', 'before\nx', 'X');
    expect(result.mergedCode).toBe('before\nX');
    expect(result.conflicts).toEqual([]);
  });
  it('handles empty base without a phantom trailing line', () => {
    const result = mergeCode('', 'left', 'right');
    expect(result.mergedCode).toBe('<<<<<<< BRANCH A\nleft\n=======\nright\n>>>>>>> BRANCH B');
    expect(result.conflicts[0]).toMatchObject({ startLine: 1, endLine: 1 });
  });
  it('provides exact ranges for multiple conflicts after insertion', () => {
    const result = mergeCode('a\nkeep\nb', 'intro\nA\nkeep\nB', 'X\nkeep\nY');
    expect(result.conflicts).toHaveLength(2);
    for (const conflict of result.conflicts) {
      expect(result.mergedCode.split('\n').slice(conflict.outputStartLine - 1, conflict.outputEndLine)).toEqual(['<<<<<<< BRANCH A', ...conflict.branchALines, '=======', ...conflict.branchBLines, '>>>>>>> BRANCH B']);
    }
  });
  it('represents deletion as zero lines', () => {
    const result = mergeCode('a\nb', 'b', 'A\nb');
    expect(result.conflicts[0].branchALines).toEqual([]);
    expect(result.conflicts[0].branchBLines).toEqual(['A']);
  });
  it('preserves trailing newlines and independent deletion/modification', () => {
    expect(mergeCode('a\nb\nc\n', 'a\nc\n', 'a\nb\nC\n').mergedCode).toBe('a\nC\n');
  });
  it('bounds quadratic comparison work', () => {
    const base = Array.from({length: 1500}, (_, i) => `line ${i}`).join('\n');
    expect(() => mergeCode(base, `${base}\nA`, `${base}\nB`)).toThrow(RangeError);
  });
});
