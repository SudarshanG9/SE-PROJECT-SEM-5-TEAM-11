import './MergeInstructions.css'

function MergeInstructions() {
  const conflictingMergedCode = [
    'function greet() {',
    '<' + '<<<<<< BRANCH A',
    '    console.log("Hello from Branch A");',
    '=======',
    '    console.log("Hello from Branch B");',
    '>' + '>>>>>> BRANCH B',
    '}',
  ].join('\n')

  return (
    <article className="instructions-page" aria-labelledby="instructions-title">
      <header className="instructions-header">
        <p className="eyebrow">FIRST-TIME USER GUIDE</p>
        <h2 id="instructions-title">How to use the merge simulator</h2>
        <p>
          Learn what the three code versions mean, how to run a simulation, and
          what to look for in its result.
        </p>
      </header>

      <section className="instructions-section" aria-labelledby="guide-intro">
        <h3 id="guide-intro">What does the simulator do?</h3>
        <p>
          Developers use branches to work on changes independently. When two
          branches are brought together, changes to the same part of a file can
          conflict. This simulator compares both branches with their shared
          starting code and shows which changes can be combined and which need
          review.
        </p>
      </section>

      <section className="instructions-section" aria-labelledby="guide-versions">
        <h3 id="guide-versions">Understand the three code versions</h3>
        <dl className="version-list">
          <div>
            <dt>Base</dt>
            <dd>
              The original code before either branch introduced its changes.
              It is the common starting point for the comparison.
            </dd>
          </div>
          <div>
            <dt>Branch A</dt>
            <dd>
              The first developer&apos;s modified version of the Base code.
            </dd>
          </div>
          <div>
            <dt>Branch B</dt>
            <dd>
              The second developer&apos;s modified version of the Base code.
            </dd>
          </div>
        </dl>
        <p>
          All three versions are needed so the simulator can compare each
          branch&apos;s changes with the same original code.
        </p>
      </section>

      <section className="instructions-section" aria-labelledby="guide-steps">
        <h3 id="guide-steps">How to run a merge simulation</h3>
        <ol className="instructions-steps">
          <li>Open the merge simulator using the navigation above.</li>
          <li>Locate the Base, Branch A, and Branch B code sections.</li>
          <li>Enter the original code in Base.</li>
          <li>Enter the first modified version in Branch A.</li>
          <li>Enter the second modified version in Branch B.</li>
          <li>Select <strong>Simulate Merge</strong>.</li>
          <li>Wait for the merge result to appear.</li>
          <li>Review the code under <strong>Merged Code</strong>.</li>
          <li>Examine the conflict count and details, if any are reported.</li>
        </ol>
      </section>

      <section className="instructions-section" aria-labelledby="guide-examples">
        <h3 id="guide-examples">Example scenarios</h3>
        <section className="scenario-card" aria-labelledby="clean-example">
          <h4 id="clean-example">Non-conflicting changes</h4>
          <p>
            Branch A adds a <code>welcome</code> function between the existing
            functions. Branch B adds a <code>goodbye</code> function after the
            existing code. These are separate insertion points, so neither
            change overwrites the other.
          </p>
          <div className="scenario-code-grid">
            <div>
              <h5>Base</h5>
              <pre>{`function greet() {
    console.log("Hello");
}

function status() {
    console.log("Ready");
}`}</pre>
            </div>
            <div>
              <h5>Branch A</h5>
              <pre>{`function greet() {
    console.log("Hello");
}

function welcome() {
    console.log("Welcome");
}

function status() {
    console.log("Ready");
}`}</pre>
            </div>
            <div>
              <h5>Branch B</h5>
              <pre>{`function greet() {
    console.log("Hello");
}

function status() {
    console.log("Ready");
}

function goodbye() {
    console.log("Goodbye");
}`}</pre>
            </div>
          </div>
          <p>
            The merge engine combines these independent changes and reports
            <strong> Merge completed successfully</strong>. The merged output is:
          </p>
          <pre className="scenario-output">{`function greet() {
    console.log("Hello");
}

function welcome() {
    console.log("Welcome");
}

function status() {
    console.log("Ready");
}

function goodbye() {
    console.log("Goodbye");
}`}</pre>
        </section>

        <section className="scenario-card conflict-example" aria-labelledby="conflict-example">
          <h4 id="conflict-example">Conflicting changes</h4>
          <p>
            Both developers change the same original <code>console.log</code>{' '}
            line, but they replace it with different text. The merge engine
            reports one conflict on line 2. Its merged output is:
          </p>
          <pre className="scenario-output">{conflictingMergedCode}</pre>
          <ul className="marker-explanations">
            <li><code>&lt;&lt;&lt;&lt;&lt;&lt;&lt; BRANCH A</code> begins Branch A&apos;s version.</li>
            <li><code>=======</code> separates the two versions.</li>
            <li><code>&gt;&gt;&gt;&gt;&gt;&gt;&gt; BRANCH B</code> ends the conflict after Branch B&apos;s version.</li>
          </ul>
          <p>
            The service reports <strong>Merge completed with 1 conflict(s)</strong>,
            and the simulator shows <strong>1 conflict detected</strong> with
            both branch versions and the Base line. This is illustrative
            conflict output; review the alternatives and decide what the final
            code should be.
          </p>
        </section>
      </section>

      <section className="instructions-section" aria-labelledby="guide-results">
        <h3 id="guide-results">Understand the result</h3>
        <div className="result-types">
          <div>
            <h4>Successful merge</h4>
            <p>
              <strong>Merged successfully</strong> means no conflict was
              reported. Review the merged code before using it.
            </p>
          </div>
          <div>
            <h4>Merge conflict</h4>
            <p>
              Different changes overlap, so the simulator could not combine
              that part safely. Review the conflict details and decide how to
              resolve the changes. A conflict is not necessarily an application
              error.
            </p>
          </div>
        </div>
        <p>
          Conflict details show a conflict number and line range, the changes
          from Branch A and Branch B, and the Base text when available. The
          simulator reports conflicts; it does not resolve them automatically.
        </p>
      </section>

      <section className="instructions-section" aria-labelledby="guide-faq">
        <h3 id="guide-faq">Frequently asked questions</h3>
        <dl className="guide-faq">
          <div>
            <dt>Why do I need the Base version?</dt>
            <dd>
              It shows what both developers started with, allowing the
              simulator to identify each branch&apos;s changes.
            </dd>
          </div>
          <div>
            <dt>Does a successful result mean I can skip review?</dt>
            <dd>
              No. Always review the merged code before using it in a project.
            </dd>
          </div>
          <div>
            <dt>Does the simulator choose how to resolve a conflict?</dt>
            <dd>
              No. It displays the conflicting changes for a developer to review.
            </dd>
          </div>
        </dl>
      </section>
    </article>
  )
}

export default MergeInstructions
