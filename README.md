# deploy-orchestrator

React SPA — the Gluon-equivalent front for the `deploy-manifest`
orchestrator. The backend lives in a separate repo:
[`deploy-orchestrator-api`](https://github.com/progmise/deploy-orchestrator-api)
(GitHub OAuth + allowlist + `/api/gh` proxy). Sign-in uses **GitHub OAuth**;
GitHub reads use the caller's own token (HttpOnly cookie — nothing secret in
the browser).

Sidebar (Gluon-style): **Aplicación** (platform detail card: manifest
version, component/env counts, lifecycle, responsables), **Componentes**
(table + dependency graph), **Equipo** (member registry + roles),
**Despliegues** (orchestrated runs joined to their RLSE record) and
**Releases** (RLSE registry — draft = pending approval, published =
deployable; detail shows the environment lifecycle + trails).

The **Componentes** view merges the manifest with the Supabase-backed
component catalog — a **Nuevo componente +** wizard (template → info →
personalización → summary) provisions a repo from a template, its Vercel
project and secrets/vars, and opens the manifest registration PR. Clicking a
component opens its detail card (status, links, responsables, tools); failed
components can be retried in place. The gallery's **Nueva plantilla +**
wizard registers an existing template repo (or generates one from a base)
with its `fields` + provisioning `spec` — no API code change needed.

## Stack

- `src/` — React 19 + Vite SPA → `dist/`
- `server/index.js` — thin delivery shell: serves `dist/` + proxies
  `/api/*` to `API_UPSTREAM` (the api service). No secrets, no auth logic —
  the session cookie just rides through, so everything stays same-origin
  (`SameSite=Lax`, no CORS)
- `Dockerfile` — self-contained (npm build → node runtime), `PORT` aware

## Local

```bash
cp .env.example .env   # API_UPSTREAM → a running deploy-orchestrator-api
npm ci
npm run build
npm start              # :8080 — /api/* proxies to the API
```

## CI/CD

Same `app-*` thin callers as every deployable repo
(`reusable-workflows@v1`): CI on PR, integration publishes
`docker.io/progmise/deploy-orchestrator` on merge, release tags + publishes
`:<version>` (version lives in `package.json`), deploy to Vercel via
`deploy.yml` or the `deploy-manifest` orchestrator.

## Required config

Repo secrets/vars: `DOCKER_TOKEN` + `DOCKER_USERNAME` (var),
`VERCEL_TOKEN` + `VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` (vars).

Vercel project env vars (Production): **`API_UPSTREAM`** = the api service
URL (e.g. `https://deploy-orchestrator-api.vercel.app`). OAuth credentials
(`GITHUB_CLIENT_*`), `ALLOWED_USERS` and `FRONTEND_URL` live on the
**api** project — the OAuth App's callback must be
`https://<this-app>.vercel.app/api/auth/callback` (it is proxied through).

The Vercel project's **Framework Preset must be `Container`**
(Settings → General → Build & Development Settings). Vercel builds
the root `Dockerfile` and routes all traffic to the container.
