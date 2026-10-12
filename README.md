# Web Code Merge Simulator

A web-based simulator for three-way code merging: create branches, simulate
merges, detect conflicts, and resolve them. 

## Tech Stack
- Backend: Node.js, Express
- Frontend: Vite
- Testing: Jest, Supertest

## Prerequisites
- Node.js 22 or compatible
- Git

## Setup

```bash
git clone https://github.com/SudarshanG9/SE-PROJECT-SEM-5-TEAM-11.git
cd SE-PROJECT-SEM-5-TEAM-11
```

### Backend
```bash
cd backend
npm ci
npm test
npm start        # http://localhost:3000
```

### Frontend (separate terminal)
```bash
cd frontend
npm ci
npm test
npm run build
npm run dev      # usually http://localhost:5173
```

## Commands

| Command | Where | Purpose |
|---|---|---|
| `npm ci` | backend / frontend | Install dependencies |
| `npm start` | backend | Run API on port 3000 |
| `npm run dev` | frontend | Start dev server |
| `npm run build` | frontend | Production build |
| `npm test` | backend / frontend | Run tests |

## API Overview
- `GET /health`: service health check
- `POST /merge`: body `{sessionId, baseId, branchAId, branchBId}`; returns
  `{status: "merged" | "conflict", mergedContent?, conflicts?}`

Errors use the envelope `{code, message}`.

## Contributing
- Don't commit `node_modules/`.
- Pull the latest code before starting work.
- Use separate feature branches and pull requests.
