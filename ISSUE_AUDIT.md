# Issue implementation audit — 25 October 2026

## Scope and baseline

Reviewed all 12 repository issues (#5–#16), the repository issue comments
(no comments returned), current main source, tests, configuration, README, and
recent CI results. Baseline commit: `aa95482a57be8b09792e3f7f79f6ad04c9cf021d`.
All 12 issues remained open at review time; an open issue is not proof that its
feature is missing. This audit covers source and issue acceptance criteria,
not a separate conformance review of the SRS/SAD Word documents.

Baseline local validation: **20 backend tests and 8 frontend tests passed**.
The latest main CI run also succeeded:
https://github.com/SudarshanG9/SE-PROJECT-SEM-5-TEAM-11/actions/runs/39738437709

## Target: “Handle merge still has placeholder”

No issue with this exact title was returned by the all-state issue inventory.
The concern corresponds most directly to #14 and #15. On current main,
`frontend/src/App.jsx:handleMerge` already posts `{base, branchA, branchB}` to
`/api/merge`; `backend/server.js` invokes the real LCS-based `mergeCode` function.
The UI renders the API's merged code and conflict details. There is no placeholder
merge implementation remaining in this path.

PR #20's description said its merge output was a placeholder, but PR #22 later
integrated the real API. PR #23, “Fix frontend merge integration,” was closed
without merging. Current source and passing integration tests are the evidence
for implementation, rather than the older PR descriptions.

This change hardens the existing path: relative/configurable API URL, Vite proxy,
structured parser/size errors, response-shape validation, disabled input editing
while submitting, duplicate-submit protection, and invalidation of stale output.

## Issue matrix

| Issue | Baseline assessment | Changes and evidence |
|---|---|---|
| #5 Compare code versions | Partial: three editors existed, but no added/removed/modified-line comparison; UI rejected empty files. | Added base-to-A and base-to-B LCS comparisons, line numbers, +/− labels and colors. Replacements show removal + addition. Empty-file comparisons work; explicit opt-in enables empty merge inputs. Helper and UI tests cover this. |
| #6 Detect/display conflicts | Implemented for basic scenarios. Boundary insertion could produce an unnecessary conflict; insertion-only ranges could end before their start. | Retained markers and base/A/B display. Fixed boundary overlap behavior and insertion line range; added exact output coordinates for resolution. Engine and API tests cover metadata and multiple conflicts. |
| #7 Manual conflict resolution | Missing. Conflict code was displayed but could not be resolved. | Branch A/B selection, custom multiline text, empty custom deletion, and unresolved counts added. Output derives from immutable original response ranges; completion waits for every resolution. Tests cover reverse-order resolution, deletion, and literal marker text. |
| #8 Reset/new merge | Partial: Clear workspace reset state immediately, without confirmation. | Added confirmation and complete reset of comparison/resolution/export state. Tests cover cancel, confirm, and another merge without refresh. |
| #9 Copy/download | Missing. | Clipboard copy, downloadable UTF-8 text blob, success/failure feedback, URL cleanup. Tests verify exported text equals displayed output. Unresolved exports remain available with a marker warning. |
| #10 Validation/errors | Partial: required/string checks and API errors existed; malformed JSON used Express's HTML error response. | JSON errors for malformed/oversized requests, bounded LCS work, frontend invalid-response handling, explicit empty-file mode. Tests cover rejection, message display, and retry. |
| #11 Instructions/examples | Partial: setup/API documentation existed; no complete user workflow or runnable example pair. | Added expandable UI guidance and two loadable examples, plus README workflow and interpretation instructions. UI tests run both examples. |
| #12 Three-way merge | Implemented, with edge-case gaps. | Kept the existing LCS/change-region algorithm and function signature. Fixed adjacent insertion/edit overlap, empty-file tokenization, and boundary-region filtering. Added regression coverage and allocation guard. |
| #13 Enter code versions | Implemented: labeled editable textareas and merge button, covered by tests. | Preserved existing cards/layout. Editors now lock during submission and invalidate stale results when changed. |
| #14 Merge API | Implemented: POST endpoint, required/string validation, real engine, tests, README. | Kept route and existing response fields; added conflict line-array/output-range metadata and consistent parser/size errors. API tests pass. |
| #15 Display merge results | Implemented: API result, status, markers, error display. | Added resolved output/status and robust response checks. Integration tests exercise real engine results through the UI (HTTP transport mocked). |
| #16 Automated tests/CI | Implemented for configured branches, but push trigger excluded other names, such as test/*; lint was not in CI. | Push trigger now covers all branches; PRs to main still run tests/build. Added frontend lint. Local setup/test instructions retained and extended. |

Issue links: https://github.com/SudarshanG9/SE-PROJECT-SEM-5-TEAM-11/issues

## Design and preservation

No directories, existing source files, components, package dependencies, or
lockfiles were removed or reorganized. Existing React state, editor cards,
Express routes, and merge engine remain. Focused edits to existing code are
necessary to connect new features; the request was interpreted as preserving
architecture and working behavior, rather than literally forbidding all edits.

Added `frontend/src/mergeWorkspace.js` for pure comparison/resolution helpers,
two frontend test files, and this audit. Conflict response additions are backward
compatible for consumers that ignore unknown properties. The new UI expects the
new metadata, so frontend/backend should be deployed together.

Manual resolution does not search/replace marker strings. It uses 1-based
inclusive output ranges supplied by the engine and applies replacements in
reverse order. This prevents earlier resolutions from shifting later ranges,
avoids matching marker-like source text, and supports actual zero-line deletions.

The original LCS algorithm has O(n*m) time/space cost for each base/branch pair.
A 2,000,000-cell guard prevents excessive allocations; unchanged/identical branch
shortcuts still return immediately. Express's existing 100 KB JSON body limit
remains. These are explicit snippet-size limits, not support for arbitrary large
repositories.

## Validation

- Backend: **29 tests passed** across 3 files (baseline 20).
- Frontend: **26 tests passed** across 3 files (baseline 8).
- Frontend production build: **passed**.
- Frontend Oxlint: **passed**.
- Whitespace/error check: `git diff --check` passed.
- Frontend workflow tests use jsdom and mocked fetch wired to the actual backend
  merge function. API tests exercise Express with Supertest. Clipboard and
  download APIs are mocked; downloaded blob contents are read back and checked.

Coverage includes independent changes, conflicting edits, boundary insertions,
empty base, delete/modify conflicts, trailing newlines, exact conflict ranges,
multiple/manual resolutions, custom deletion, copy failure, export contents,
confirmed reset, empty-input opt-in, examples, stale-output invalidation,
malformed responses, request retries, pending-state controls, and size limits.

## Remaining limits

This is a line-oriented educational simulator, not a full Git merge replacement.
It does not perform repository operations, AST/semantic merging, binary merging,
or persistent workspace storage. Repeated lines may produce different alignment
choices than Git. No claim is made that every possible three-way text merge is
conflict-minimal. Production needs API routing as documented in README.

A real-browser visual/accessibility audit and live clipboard/download interaction
were not performed; automated DOM behavior, build, API, and engine validation
are the evidence reported here. Issues are left open for maintainer review, and
main is not changed by preparing this implementation branch/pull request.
