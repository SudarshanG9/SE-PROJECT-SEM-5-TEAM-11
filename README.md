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

### `POST /merge` (planned)

Performs a three-way merge. This endpoint is specified in the Software
Architecture Document (section 4.3) and is not yet available on `main`.

Request:

```json
{
  "sessionId": "string",
  "baseId": "string",
  "branchAId": "string",
  "branchBId": "string"
}
```

Response:

```json
{
  "status": "merged | conflict",
  "mergedContent": "string (optional)",
  "conflicts": "array (optional)"
}
```

Errors use the envelope `{ "code", "message" }`:

| Status | Meaning |
|---|---|
| 400 | Invalid branch reference |
| 409 | Conflict detected |
| 422 | Malformed file content |

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
| `api.test.js` | Unknown routes (404) and CORS headers |
| `merge.test.js` | Merge engine logic |
| `merge.api.test.js` | `POST /merge` API (planned cases) |

## Contributing

- Don't commit `node_modules/`.
- Pull the latest `main` before starting work.
- Use a separate feature branch for each piece of work and open a pull request.
- Keep `main` runnable: all tests must pass before merging.
- Don't edit files another member is working on without coordinating first.
