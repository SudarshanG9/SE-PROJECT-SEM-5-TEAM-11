# Merge Simulator User Guide

## Introduction

The Web-Based Code Merge Simulator demonstrates how changes from two development
branches can be combined with their common starting point. Developers use
branches to work on different changes independently. When those changes are
combined, edits to the same part of a file can conflict and need a person's
review.

The simulator compares three versions of code and shows the merged output. It
reports overlapping changes as conflicts rather than choosing a branch's code
for you.

## Understanding the three code versions

### Base Version

Base is the original source code before either branch's changes. It is the
common ancestor used to determine what changed in each branch.

### Branch A Version

Branch A is the first developer's version of the code, including their changes
from Base.

### Branch B Version

Branch B is the second developer's version of the code, including their
changes from Base.

All three versions are needed because the simulator compares each branch with
the same original code. Comparing only the two branches would not show which
lines were changed, added, or left untouched relative to their common starting
point.

## How to use the simulator

1. Open the merge simulator.
2. Locate the Base, Branch A, and Branch B code sections.
3. Enter the original code in Base.
4. Enter the first modified version in Branch A.
5. Enter the second modified version in Branch B.
6. Select **Simulate Merge**.
7. Wait for the merge request to complete.
8. Review the code shown under **Merged Code**.
9. If conflicts are reported, review the conflict count, line information,
   both branch versions, and the Base code when available.

The simulator displays the result returned by its merge service. It does not
automatically resolve conflicts for you.

## Example scenarios

The examples below use the simulator's actual merge engine. The non-conflicting
example inserts code at two different locations; adding both functions at the
same end-of-file position would be treated as overlapping insertions by this
engine.

### Non-conflicting merge

Branch A adds a `welcome` function between the existing functions. Branch B
adds a `goodbye` function after the existing code. These changes use separate
insertion points, so neither overwrites the other.

Base:

```javascript
function greet() {
    console.log("Hello");
}

function status() {
    console.log("Ready");
}
```

Branch A:

```javascript
function greet() {
    console.log("Hello");
}

function welcome() {
    console.log("Welcome");
}

function status() {
    console.log("Ready");
}
```

Branch B:

```javascript
function greet() {
    console.log("Hello");
}

function status() {
    console.log("Ready");
}

function goodbye() {
    console.log("Goodbye");
}
```

The merge engine reports **Merge completed successfully** and returns:

```javascript
function greet() {
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
}
```

Both additions appear in the merged code, with no conflict reported.

### Conflicting merge

Both branches change the same original line to different text.

Base:

```javascript
function greet() {
    console.log("Hello");
}
```

Branch A:

```javascript
function greet() {
       console.log("Hello from Branch A");
}
```

Branch B:

```javascript
function greet() {
     console.log("Hello from Branch B");
}
```

The merge engine reports **Merge completed with 1 conflict(s)**. The actual merged code is:

<pre><code>function greet() {
&lt;&lt;&lt;&lt;&lt;&lt;&lt; BRANCH A
&#32;&#32;&#32;&#32;console.log("Hello from Branch A");
&#61;======
&#32;&#32;&#32;&#32;console.log("Hello from Branch B");
&gt;&gt;&gt;&gt;&gt;&gt;&gt; BRANCH B
}</code></pre>

The simulator displays **1 conflict detected** and identifies the changed
line as line 2. The markers mean:

- `<<<<<<< BRANCH A` begins the Branch A version.
- `=======` separates Branch A from Branch B.
- `>>>>>>> BRANCH B` ends the conflict after the Branch B version.

The conflict details also show both branch texts and the Base line. These
markers are illustrative output from the existing merge engine; a developer
must review the alternatives and decide what the final code should contain.

## Understanding merge results

### Successful merge

The simulator shows **Merged successfully** when the merge service reports no
conflicts. The changes were combined without an overlapping edit that the
simulator could not automatically combine. Review the merged code before using
it in a project.

### Merge conflict

A conflict means both branches made different changes to overlapping code.
The simulator keeps both branch versions in the merged output using conflict
markers and shows a conflict count and details. This is not necessarily an
application error: it indicates that a developer should review the changes
and decide how they should be combined.

Conflict details identify a conflict number and line range, show the Branch A
and Branch B text, and may provide the Base text in an expandable section.
Review all three pieces of context before resolving a conflict.

## Common beginner mistakes

- Entering a branch version that does not include the intended changes from
  Base.
- Comparing branches that were not both created from the same Base version.
- Treating a conflict as a failed application request instead of a request for
  a developer to review overlapping changes.
- Using the conflict-marked output as finished code without resolving and
  reviewing the changes.
- Forgetting to inspect the full merged output after a successful merge.
