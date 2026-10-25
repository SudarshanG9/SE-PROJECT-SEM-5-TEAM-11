# Web Code Merge Simulator

A web-based simulator for three-way code merging. Users can paste a base file and two branch versions,
simulate merges, view differences and conflicts, and resolve them.

SE Project, Semester 5, Team 11.

## Tech Stack

- **Backend:** Node.js, Express
- **Frontend:** Vite
- **Testing:** Vitest, Supertest

## Prerequisites

- Node.js 22 or a compatible version
- Git

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/SudarshanG9/SE-PROJECT-SEM-5-TEAM-11.git
cd SE-PROJECT-SEM-5-TEAM-11
```

### 2. Backend

```bash
cd backend
npm ci
npm test
npm start
```

The backend runs at `http://localhost:3000`.

### 3. Frontend

Open a second terminal in the project root:

```bash
cd frontend
npm ci
npm test
npm run build
npm run dev
```

Open the local URL printed in the terminal, usually `http://localhost:5173`.

## Commands

| Command | Run from | Purpose |
|---|---|---|
| `npm ci` | `backend`, `frontend` | Install dependencies from the lockfile |
| `npm start` | `backend` | Start the API on port 3000 |
| `npm test` | `backend`, `frontend` | Run the test suite |
| `npm run dev` | `frontend` | Start the development server |
| `npm run build` | `frontend` | Create a production build |
| `npm run lint` | `frontend` | Check source with the existing Oxlint configuration |

## API Overview

### `GET /api/health`

Checks that the backend is running.

Response `200`:

```json
{
  "status": "ok",
  "message": "Code Merge Simulator API is running"
}
```

### `POST /api/merge`

Performs a three-way merge using the original code and two edited versions.

Request:

```json
{
  "base": "const x = 1;",
  "branchA": "const x = 2;",
  "branchB": "const x = 1;"
}
```

Response `200`:

```json
{
  "mergedCode": "const x = 2;",
  "hasConflict": false,
  "message": "Merge completed successfully",
  "conflicts": []
}
```

Conflicting merges also return `200`, with `hasConflict: true`, conflict markers
in `mergedCode`, and conflict details (`id`, `startLine`, `endLine`, `base`,
`branchA`, `branchB`, `branchALines`, `branchBLines`, `outputStartLine`,
`outputEndLine`). Output ranges are 1-based and inclusive; line arrays preserve
the distinction between deleting a region and keeping an empty line. Missing or non-string fields return `400` with an
`{ "error": "..." }` response. Empty strings are valid API file content; the UI
requires nonblank text by default; select **Allow empty file inputs** to model
new files, deletions, or whitespace-only content. Malformed JSON returns `400`;
bodies exceeding the Express 100 KB limit or comparisons exceeding 2,000,000
LCS cells return `413`, always with a JSON error message.

## Testing

Backend tests use [Vitest](https://vitest.dev) with
[Supertest](https://github.com/ladjs/supertest). Test files are in
`backend/tests/`.

```bash
cd backend
npm test
```

| File | Covers |
|---|---|
| `health.test.js` | `GET /api/health` |
| `api.test.js` | Unknown routes, CORS, merge responses, and request validation |
| `merge.test.js` | Merge engine logic |

## Contributing

- Don't commit `node_modules/`.
- Pull the latest `main` before starting work.
- Use a separate feature branch for each piece of work and open a pull request.
- Keep `main` runnable: all tests must pass before merging.
- Don't edit files another member is working on without coordinating first.


## Using the simulator

1. Base is the common original file; Branch A and Branch B are independently
   edited copies. Load either built-in example under **How to use MergeLab**.
2. **Compare versions** shows base-to-branch changes with line numbers and
   explicit + / − indicators. Modifications appear as a removal plus an addition.
3. **Simulate Merge** calls the API. Independent edits are combined; differing
   edits in an overlapping region are preserved in a conflict block.
4. For every conflict, select **Use Branch A**, **Use Branch B**, or enter text
   and select **Apply custom resolution**. An empty custom resolution deletes
   the region. The result remains incomplete until every conflict is resolved.
5. Copy or download the displayed output. Exports include markers if conflicts
   remain unresolved. Clipboard access may require HTTPS or localhost; download
   remains available when clipboard access is denied.
6. **Clear workspace** asks for confirmation and resets inputs, results, and
   resolutions. Changing an input invalidates the old result.

Non-conflicting example: Base `a\nb`, A `A\nb`, B `a\nB` produces `A\nB`.
Conflicting example: Base `a`, A `A`, B `B` requires choosing or editing a result.
Here `\n` represents a newline, not the two literal characters.

## API routing and deployment

During `npm run dev`, Vite proxies `/api` to `http://localhost:3000`.
Production hosting must reverse-proxy `/api` to the backend, or build with
`VITE_API_URL=https://your-api-host` (no trailing slash). The generated static
frontend does not start or include the Express server. Run both services from
this revision because manual resolution uses the additional conflict metadata.

## Validation and scope

CI runs backend tests, frontend tests, frontend lint, and the production build.
Pushes to every branch and pull requests into main trigger checks. See
[ISSUE_AUDIT.md](ISSUE_AUDIT.md) for the issue-by-issue assessment and test evidence.
The simulator merges text snippets, not Git repositories or syntax trees;
repeated-line alignments can differ from Git. Workspaces are held in browser
memory and are cleared on refresh. The comparison algorithm is quadratic and
intentionally bounded for interactive use.
