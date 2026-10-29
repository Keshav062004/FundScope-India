# FundScope India: frontend

React + TypeScript + Vite app. It talks to the FastAPI backend in `../backend`.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
```

The backend must be running on port 8000 (see the root README). Vite proxies `/api` to it.
The API base defaults to `/api`. Copy `.env.example` to `.env.local` to override
`VITE_API_BASE_URL`; for a separate production backend, set it to the deployed
backend origin followed by `/api`. The backend CORS origin must also be configured
for that deployment before cross-origin requests can work.

## Build

```bash
npm run build      # type-checks, then builds to dist/
```
