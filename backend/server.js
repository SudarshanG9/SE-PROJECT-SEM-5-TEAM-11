
const express = require("express");
const cors = require("cors");
const { mergeCode } = require("./merge");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Code Merge Simulator API is running",
  });
});

/**
 * POST /api/merge
 *
 * Accepts three code strings (base, branchA, branchB) and returns a
 * three-way merge result, including any conflicting regions.
 *
 * Request body:
 *   { base: string, branchA: string, branchB: string }
 *
 * Response:
 *   { mergedCode: string, hasConflict: boolean, message: string, conflicts: array }
 */
app.post("/api/merge", (req, res) => {
  const { base, branchA, branchB } = req.body || {};

  // Validate that all three inputs are present
  if (base === undefined || branchA === undefined || branchB === undefined) {
    return res.status(400).json({
      error: "Missing required fields: base, branchA, and branchB are all required.",
    });
  }

  if ([base, branchA, branchB].some((input) => typeof input !== "string")) {
    return res.status(400).json({
      error: "base, branchA, and branchB must be strings.",
    });
  }

  const result = mergeCode(base, branchA, branchB);
  const hasConflict = result.conflicts && result.conflicts.length > 0;

  return res.status(200).json({
    mergedCode: result.mergedCode,
    hasConflict,
    message: result.message,
    conflicts: result.conflicts,
  });
});

// Keep parser and merge failures in the same JSON contract as validation errors.
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON request body." });
  }
  if (error.type === "entity.too.large" || error instanceof RangeError) {
    return res.status(413).json({ error: "Input is too large. Use smaller code snippets." });
  }
  return res.status(500).json({ error: "Unable to merge these inputs. Please try again." });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
  });
}

module.exports = app;

