# Web Code Merge Simulator

A web-based simulator for three-way code merging. Users can create branches,
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
`branchA`, `branchB`). Missing or non-string fields return `400` with an
`{ "error": "..." }` response. Empty strings are valid API file content; the UI
requires nonblank text in all three editors before submitting.

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
