
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { mergeCode } = require("../merge.js");

describe("mergeCode", () => {
  it("returns a placeholder merge result", () => {
    const result = mergeCode(
      "console.log('base');",
      "console.log('branch A');",
      "console.log('branch B');"
    );

    expect(result.mergedCode).toBe("console.log('branch A');");
    expect(result.conflicts).toEqual([]);
    expect(result.message).toBe("Placeholder merge completed");
  });

  it("returns branch A when the branches are different", () => {
    const result = mergeCode(
      "let count = 0;",
      "let count = 1;",
      "let count = 2;"
    );

    expect(result.mergedCode).toBe("let count = 1;");
  });
});
