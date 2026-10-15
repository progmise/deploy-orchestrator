# AGENTS.md

Guide for working on **deploy-orchestrator** — the progmise release
orchestration dashboard (React + Vite SPA with a thin Express server that
serves `dist/` and proxies `/api/*` to `deploy-orchestrator-api` — OAuth and
all business logic live there).

## Architecture

Same dependency direction as the APIs' hexagonal layout, React-flavored:
`ui/` → `application/` → `infrastructure/`; `domain/` imports nothing.
Components never call `fetch` directly.

```
src/
  main.jsx                   entry, renders app/App
  app/App.jsx                shell — topbar, crumbs, sidebar, view switch
  domain/component.js        pure rules: NAME_RE/REPO_RE, STATUS_LABEL,
                             mergeCatalog (manifest ⨝ catalog), filter
  application/               use cases as hooks:
    useSession.js            signed-in user + auth:required listener
    useDashboardData.js      manifest + runs + deployments + catalog +
                             templates reload
    useComponentRuns.js      last deploy runs of one repo
    useMembers.js            team registry (loads on Equipo view)
    useReleases.js           RLSE registry list + detail w/ run refresh
  infrastructure/api/        the ONLY fetch boundary:
    client.js                apiGet (401 → auth:required event) + apiSend
    sessionApi.js            /api/me
    githubApi.js             /api/gh/* proxy (incl. getRepo) + /api/manifest
    catalogApi.js            /api/templates, /api/components*, /api/members,
                             /api/platform/keys, /api/deployments,
                             /api/releases* (RLSE list/create/detail/
                             publish/deploy — server-side GitHub actions)
  ui/
    components/              shared presentational (Feedback, Icons,
                             Select/DateField/TimeField combos — popovers
                             flip up via useDropUp)
    features/
      session/Gate.jsx       Login / Unauthorized / UserMenu
      app/ApplicationView.jsx   platform detail card (deploy-manifest) —
                                first sidebar item / landing view
      releases/ReleasesView.jsx, ReleaseDetail.jsx
      components/            ComponentsTable, ComponentDetail (Gluon-style
                             app card), ComponentRuns,
                             DependencyGraph (mermaid), FiltersMenu,
                             ComponentWizard — 4 steps; "Personalización"
                             renders the template's `fields` (select/fixed)
                             from /api/templates, answers go to
                             components.config,
                             TemplateGallery + TemplateWizard — register a
                             template repo (existing or /generate from a
                             base) with fields + spec toggles
      team/MembersView.jsx   member registry + roles
      deployments/OrchRuns.jsx
server/index.js              Express — serves dist/ + proxies ALL /api/* to
                             deploy-orchestrator-api (API_UPSTREAM)
```

Rules:
- All API access is same-origin `/api/*` (`vite.config.js` proxies to the API
  in dev). No tokens in the browser — OAuth lives in `deploy-orchestrator-api`,
  the session rides in an HttpOnly cookie.
- Any 401 from `infrastructure/api/client.js` fires `auth:required`; the app
  drops back to the login screen.
- `StatusPill`/`RunBadge` are components (capitalized) — keep them so, for
  Fast Refresh.
- New external call? Add it to `infrastructure/api/` and consume through an
  `application/` hook — not from a component.

## Verify before done

```bash
npm run build
npm run lint        # oxlint — keep at 0 warnings
```

## Branches

GitFlow: `main` is the default branch and holds releases; `development` is
the integration branch (all work is PR'd there).
Work branches: `<type>/<snake_description>` — `feature/`, `fix/`, `chore/`,
`docs/`, `refactor/`.

## Release

All pipeline logic lives in `progmise/reusable-workflows` (`@v1`,
`secrets: inherit`) — callers in `.github/workflows/` are thin; keep them so.
Bump `version` in `package.json`, merge `development` → `main`, then run the
**Release** workflow manually on `main`. Deploys go through `deploy-manifest`
(`deploy.yml` dispatch); the Vercel project was created lazily on first deploy.
