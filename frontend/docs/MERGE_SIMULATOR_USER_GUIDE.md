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
