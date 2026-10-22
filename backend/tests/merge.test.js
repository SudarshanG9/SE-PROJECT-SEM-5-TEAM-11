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
