import { useState } from "react";
import "./App.css";

function App() {
  const [base, setBase] = useState("");
  const [branchA, setBranchA] = useState("");
  const [branchB, setBranchB] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleMerge() {
    const missingInputs = [
      !base.trim() && "Base",
      !branchA.trim() && "Branch A",
      !branchB.trim() && "Branch B",
    ].filter(Boolean);

    setResult(null);
    setError("");

    if (missingInputs.length > 0) {
      setError(`Please provide ${missingInputs.join(", ")}.`);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:3000/api/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base, branchA, branchB }),
      });

      let payload;
      try {
        payload = await response.json();
      } catch {
        setError("The merge service returned an unreadable response.");
        return;
      }

      if (!response.ok) {
        setError(payload?.error || `The merge request failed (HTTP ${response.status}).`);
        return;
      }

      if (
        typeof payload?.mergedCode !== "string" ||
        typeof payload.hasConflict !== "boolean" ||
        typeof payload.message !== "string" ||
        !Array.isArray(payload.conflicts)
      ) {
        setError("The merge service returned an invalid merge result.");
        return;
      }

      setResult(payload);
    } catch (requestError) {
      const detail =
        requestError instanceof Error ? `: ${requestError.message}` : ".";
      setError(`Unable to reach the merge service${detail}`);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="app">
      <header className="page-header">
        <p className="eyebrow">DEVELOPER TOOL</p>
        <h1>Three-Way Merge Simulator</h1>
        <p className="subtitle">
          Compare your base code with two branches and simulate a merge.
        </p>
      </header>

      <section className="editor-grid">
        <div className="editor-card">
          <label htmlFor="base">Base</label>
          <p className="editor-description">The original version</p>
          <textarea
            id="base"
            value={base}
            onChange={(e) => setBase(e.target.value)}
            placeholder="Enter base code here..."
            spellCheck="false"
          />
        </div>

        <div className="editor-card">
          <label htmlFor="branch-a">Branch A</label>
          <p className="editor-description">First set of changes</p>
          <textarea
            id="branch-a"
            value={branchA}
            onChange={(e) => setBranchA(e.target.value)}
            placeholder="Enter Branch A code here..."
            spellCheck="false"
          />
        </div>

        <div className="editor-card">
          <label htmlFor="branch-b">Branch B</label>
          <p className="editor-description">Second set of changes</p>
          <textarea
            id="branch-b"
            value={branchB}
            onChange={(e) => setBranchB(e.target.value)}
            placeholder="Enter Branch B code here..."
            spellCheck="false"
          />
        </div>
      </section>

      <div className="actions">
        <button type="button" onClick={handleMerge} disabled={isLoading}>
          {isLoading ? "Merging..." : "Simulate Merge"}
        </button>

        <button
          type="button"
          className="clear-button"
          onClick={() => {
            setBase('')
            setBranchA("");
            setBranchB("");
            setResult(null);
            setError("");
          }}
        >
          Clear All
        </button>
      </div>

      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}

      {result && (
        <section className="result-card" aria-live="polite">
          <p>{result.message}</p>
          <h2>Merge status</h2>
          <p>
            {result.hasConflict
              ? "Conflicts require attention"
              : "Successful merge"}
          </p>
          <h2>Merged output</h2>
          <pre>{result.mergedCode}</pre>

          {result.conflicts.length > 0 && (
            <>
              <h2>Conflict details</h2>
              {result.conflicts.map((conflict) => (
                <article key={conflict.id} className="conflict">
                  <h3>
                    Conflict {conflict.id} (line
                    {conflict.startLine === conflict.endLine ? "" : "s"}{" "}
                    {conflict.startLine}
                    {conflict.startLine === conflict.endLine
                      ? ""
                      : `-${conflict.endLine}`}
                    )
                  </h3>
                  <p>Base</p>
                  <pre>{conflict.base}</pre>
                  <p>Branch A</p>
                  <pre>{conflict.branchA}</pre>
                  <p>Branch B</p>
                  <pre>{conflict.branchB}</pre>
                </article>
              ))}
            </>
          )}
        </section>
      )}
    </main>
  );
}

export default App;