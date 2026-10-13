
const express = require("express");
const cors = require("cors");

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
 * placeholder merge result. The real merge algorithm will replace the
 * placeholder logic in a future iteration.
 *
 * Request body:
 *   { base: string, branchA: string, branchB: string }
 *
 * Response:
 *   { mergedCode: string, hasConflict: boolean, message: string }
 */
app.post("/api/merge", (req, res) => {
  const { base, branchA, branchB } = req.body;

  // Validate that all three inputs are present
  if (base === undefined || branchA === undefined || branchB === undefined) {
    return res.status(400).json({
      error: "Missing required fields: base, branchA, and branchB are all required.",
    });
  }

  // Placeholder merge result — to be replaced with real merge logic
  const mergedCode = `<<<<<<< Branch A\n${branchA}\n=======\n${branchB}\n>>>>>>> Branch B`;
  const hasConflict = branchA !== branchB;

  return res.status(200).json({
    mergedCode,
    hasConflict,
    message: hasConflict
      ? "Merge completed with conflicts. Please resolve them manually."
      : "Merge completed successfully with no conflicts.",
  });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
  });
}

module.exports = app;
