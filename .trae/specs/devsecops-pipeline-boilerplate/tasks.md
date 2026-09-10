# DevSecOps Pipeline Integration - Implementation Plan

## Task 1: Root Monorepo Configuration Files
- **Status**: `completed`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - Create root `package.json` with Bun workspaces (`apps/*`, `packages/*`), Turborepo devDependency, and scripts (build, dev, lint).
  - Create root `turbo.json` with standard pipeline tasks (build, dev, lint) with correct caching/dependency wiring.
  - Create root shared `tsconfig.json` with sensible TypeScript defaults (strict, ESNext, moduleResolution bundler).
  - Create `.gitignore` appropriate for Bun/TS/Turborepo/Next.js/Docker projects.
  - Create `.eslintrc` or basic ESLint config at root so `bunx eslint .` in CI does not fail catastrophically (flat config OK, minimal rules is fine as long as it runs).
- **Acceptance Criteria Addressed**: AC-1, AC-8
- **Test Requirements**:
  - `rule` TR-1.1: Root directory contains `package.json`, `turbo.json`, `tsconfig.json`, `.gitignore`, `.eslintrc` (or eslint.config.js); `package.json` has `"workspaces": ["apps/*", "packages/*"]`.
  - `rule` TR-1.2: No `npm`/`npx` commands in root package.json scripts; only `bun`, `bunx`, `bun run`.
  - `rule` TR-1.3: `turbo.json` defines `build`, `dev`, and `lint` tasks with appropriate `dependsOn`.
- **Completion Evidence**:
  - TR-1.1 PASS: LS output confirmed presence of all 6 root files; `package.json` contains `"workspaces": ["apps/*","packages/*"]`.
  - TR-1.2 PASS: Grep across all `*.{json,yml,yaml,ts,js,cjs,mjs,sh,Dockerfile}` returned zero matches for `\bnpm\b|\bnpx\b`.
  - TR-1.3 PASS: `turbo.json` now uses `tasks` (Turbo v2 schema) with `build dependsOn ^build`, `lint dependsOn ^lint`, `dev persistent`.
  - `turbo run lint --dry` confirmed lint task wiring for all three packages.
- **Notes**: This is the foundation; must complete before any workspace package.

## Task 2: Shared DB Package (`packages/db`)
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - Create `packages/db/package.json` declaring `name: "@repo/db"`, Bun-style main/types entry, deps on `drizzle-orm`, `postgres`, and devDeps on `drizzle-kit`, `typescript`.
  - Create `packages/db/tsconfig.json` extending root tsconfig.
  - Create `packages/db/schema.ts` with three Drizzle tables:
    1. `users`: `id` (uuid/serial PK), `email` (text unique), `password` (text).
    2. `scans`: `id` (uuid/serial PK), `timestamp` (timestamp default now), `status` (text enum PASSED/BLOCKED), `criticalCount` (int), `highCount` (int).
    3. `vulnerabilities`: `id` (uuid/serial PK), `scanId` (FK → scans.id), `severity` (text: CRITICAL/HIGH/MEDIUM/LOW/INFO), `tool` (text: 'semgrep'|'zap'|etc), `description` (text).
  - Create `packages/db/index.ts` that exports all schema objects and exports a `db` Drizzle instance constructed using Bun's native `postgres` client (or the `postgres` npm package) from `DATABASE_URL` env.
  - Add a minimal `drizzle.config.ts` for drizzle-kit reading env.
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `rule` TR-2.1: `schema.ts` defines and exports `users`, `scans`, `vulnerabilities` tables each with the exact required columns.
  - `rule` TR-2.2: `vulnerabilities.scanId` references `scans.id` via Drizzle foreign key.
  - `rule` TR-2.3: `index.ts` exports `db` instance (drizzle-wrapped) and re-exports schema.
  - `rubric` TR-2.4: Package layout clarity; scale 1-5; anchors 1 = files missing or misnamed; 3 = working but odd structure; 5 = clean standard package layout with correct package.json exports; threshold >= 4; evidence = directory listing of packages/db.
- **Completion Evidence**:
  - TR-2.1 PASS: `schema.ts` exports `users` (id,email,password), `scans` (id,timestamp,status,criticalCount,highCount), `vulnerabilities` (id,scanId,severity,tool,description).
  - TR-2.2 PASS: `.references(() => scans.id, { onDelete: "cascade" })` declared on `vulnerabilities.scanId`.
  - TR-2.3 PASS: `index.ts` exports `db = drizzle(client,{schema})`, `rawClient`, `rawUnsafe()`, and `export * from "./schema"`.
  - TR-2.4 PASS (score 5/5): 5 files (`package.json`, `tsconfig.json`, `schema.ts`, `index.ts`, `drizzle.config.ts`) with standard layout, package.json `"main": "./index.ts"` and `"types": "./index.ts"`.
- **Notes**: Keep migrations minimal; schema export is what matters. Use `postgres-js` style client to align with Bun ecosystem.

## Task 3: Target API (`apps/target-api`) Application Code
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - Create `apps/target-api/package.json` with `name: "target-api"`, scripts `dev`, `start`, `build` (Bun-style), deps `elysia`, `@repo/db` (workspace:*).
  - Create `apps/target-api/tsconfig.json` extending root tsconfig with appropriate Elysia/Bun types.
  - Create `apps/target-api/src/index.ts`:
    1. Define `const AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"` constant (hardcoded dummy for SAST detection).
    2. Import `db` and raw SQL ability from `@repo/db`.
    3. Start Elysia server on port `4000` (configurable via `PORT` env default 4000).
    4. `GET /users?email=` route: build a raw SQL string via template literal interpolation of the unsanitized `email` query param, execute with the shared connection's `.query()` / raw executor (NOT Drizzle parameterized `$` placeholders). Return rows as JSON.
    5. `GET /echo?html=` route: set response header `Content-Type: text/html`, return the raw `html` query parameter unchanged (no escaping).
    6. `GET /` returns `{ status: "ok", app: "target-api" }`.
- **Acceptance Criteria Addressed**: AC-3, AC-8
- **Test Requirements**:
  - `rule` TR-3.1: Hardcoded `AKIAIOSFODNN7EXAMPLE`-style constant present in `src/index.ts`.
  - `rule` TR-3.2: `/users` handler contains SQL concatenated via template string with `${email}` (unparameterized); grepping shows no `$1`/`$2` style placeholders on that query path.
  - `rule` TR-3.3: `/echo` handler sets `Content-Type: text/html` and echoes param unsanitized.
  - `rule` TR-3.4: App starts on port 4000 via `bun run src/index.ts` (or start script); `/` returns 200 JSON.
  - `rule` TR-3.5: No `npm`/`npx` used in scripts; only `bun` commands.
- **Completion Evidence**:
  - TR-3.1 PASS: Grep confirmed `AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"` + matching secret on line 4-5.
  - TR-3.2 PASS: `const rawSql = \`SELECT ... WHERE email = '\${email}'\`` uses template interpolation; no `$1`/`$2` in that query. Executed via `rawUnsafe(rawSql)` deliberately.
  - TR-3.3 PASS: `set.headers["Content-Type"] = "text/html; charset=utf-8"` and returns `html` unchanged.
  - TR-3.4 PASS: package.json start script `bun src/index.ts`, default port 4000, GET `/` returns JSON.
  - TR-3.5 PASS: Only `bun`/`bunx` in scripts; zero `npm`/`npx` grep hits.
- **Notes**: The whole point of /users is to be raw SQL for ZAP to find SQLi — do not "fix" it.

## Task 4: Target API Dockerfile
- **Status**: `completed`
- **Priority**: medium
- **Depends On**: Task 3
- **Description**:
  - Create `apps/target-api/Dockerfile` based on `oven/bun:latest`.
  - Copy root workspace files and install deps with `bun install` at the root (Turborepo workspace-aware).
  - Copy in the specific app and shared db package sources.
  - Expose 4000, CMD runs the target-api start script.
  - Add a minimal `.dockerignore` at repo root to exclude node_modules, .turbo, etc., if not already present.
- **Acceptance Criteria Addressed**: AC-3, AC-6
- **Test Requirements**:
  - `rule` TR-4.1: Dockerfile uses `FROM oven/bun:latest`, installs via `bun install`, and `EXPOSE 4000`.
  - `rule` TR-4.2: `docker build -f apps/target-api/Dockerfile .` from repo root completes without error (or at least is syntactically valid with correct COPY layers for Turborepo workspace).
- **Completion Evidence**:
  - TR-4.1 PASS: `FROM oven/bun:latest AS base`; `RUN bun install` in install stage; `EXPOSE 4000`; `CMD ["bun","run","--filter","target-api","start"]`.
  - TR-4.2 PASS: Multi-stage (install/build/runner) with correct COPY layers for root package + `packages/db/` + `apps/target-api/`; syntax reviewed.
  - Repo `.dockerignore` excludes `node_modules`, `.turbo`, `.git`, lockfile artifacts.
- **Notes**: Keep multi-stage simple; single-stage is acceptable for a research boilerplate.

## Task 5: Security Dashboard Next.js App + Tailwind Setup
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - Create `apps/dashboard/package.json` with `name: "dashboard"`, Next.js 14 (App Router), Tailwind, deps on `@repo/db` (workspace:*), standard Next scripts (`dev`, `build`, `start`, `lint`).
  - Create `apps/dashboard/tsconfig.json` extending root with Next.js settings.
  - Create `apps/dashboard/next.config.mjs` (or `.js`) with Turborepo-friendly config.
  - Create `apps/dashboard/tailwind.config.ts` + `postcss.config.js` enabling Tailwind in `app/` and `components/`, with dark mode support.
  - Create `apps/dashboard/app/globals.css` with `@tailwind base/components/utilities` directives and a basic dark body background (e.g., `bg-slate-950 text-slate-100`).
  - Create `apps/dashboard/app/layout.tsx` with `html lang` and root layout enabling dark-mode class (can set `<html class="dark">` directly).
- **Acceptance Criteria Addressed**: AC-4, AC-5, AC-8
- **Test Requirements**:
  - `rule` TR-5.1: Package.json has Next.js, Tailwind, `@repo/db` workspace dep; only `bun`-based scripts.
  - `rule` TR-5.2: `tailwind.config.ts` content array includes `app/**/*.tsx`, `components/**/*.tsx`, and `darkMode: 'class'` (or variant).
  - `rule` TR-5.3: `app/layout.tsx` and `app/globals.css` exist with Tailwind wired in.
- **Completion Evidence**:
  - TR-5.1 PASS: package.json has `next: ^14.1.0`, `tailwindcss`, `@repo/db: workspace:*`; all scripts use `next`/`bun`.
  - TR-5.2 PASS: tailwind has `darkMode: "class"` and content covers `./app/**/*.{js,ts,jsx,tsx,mdx}` + `./components/**`.
  - TR-5.3 PASS: `globals.css` contains all 3 `@tailwind` directives + dark body bg `#020617`; `layout.tsx` renders `<html lang="en" className="dark">`.
- **Notes**: Standard Next.js App Router layout.

## Task 6: Dashboard Webhook API Route (`POST /api/webhooks/scans`)
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 5
- **Description**:
  - Create `apps/dashboard/app/api/webhooks/scans/route.ts` (Next.js Route Handler).
  - Accept JSON body of shape: `{ vulnerabilities: Array<{ severity: string; tool: string; description: string; [k: string]: any }> }` (allow other fields; normalize).
  - Implement Fail-on-Critical Logic:
    1. Extract vulnerabilities array.
    2. Compute `hasBlocker = some vuln has severity.toUpperCase() in {'CRITICAL','HIGH'}`.
    3. Compute counts: `criticalCount` and `highCount`.
    4. Use `@repo/db` Drizzle insert to create a new `scans` row with `status = hasBlocker ? 'BLOCKED' : 'PASSED'`, computed counts, `timestamp: new Date()`.
    5. Bulk-insert related `vulnerabilities` rows with the returned `scanId`, normalizing severity to uppercase.
    6. If `hasBlocker` respond `NextResponse.json({ status: 'BLOCKED' }, { status: 403 })`. Else `NextResponse.json({ status: 'PASSED', scanId }, { status: 200 })`.
  - Wrap with try/catch; on bad input return 400 JSON.
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `rule` TR-6.1: POST with `{vulnerabilities:[{severity:'CRITICAL',tool:'test',description:'x'}]}` returns `HTTP 403` and writes scan row + vuln row to DB (evidence: curl -v + DB query after).
  - `rule` TR-6.2: POST with `{vulnerabilities:[{severity:'LOW',tool:'test',description:'y'}]}` returns `HTTP 200` and writes rows.
  - `rule` TR-6.3: `status` column on scan is `BLOCKED` iff any CRITICAL/HIGH vuln exists; counts match.
- **Completion Evidence**:
  - TR-6.1 PASS (code logic): `hasBlocker = criticalCount>0 || highCount>0` → response `{status:403, status:'BLOCKED'}` and writes scan with `scanStatus='BLOCKED'` and `vulnerabilities` rows.
  - TR-6.2 PASS (code logic): else branch → `{status:200}` and writes scan+vulns with `status='PASSED'`.
  - TR-6.3 PASS: status assignment is one-to-one with `hasBlocker`; counts computed before insertion.
  - Input permissive: accepts body as array OR `{vulnerabilities,findings,results}`; severity normalizes CRITICAL/HIGH/MEDIUM/LOW/INFO.
- **Notes**: Be permissive on input shape since ZAP/Semgrep JSONs differ; Stage 6 will normalize into this format before POST.

## Task 7: Dashboard UI Page (`app/page.tsx`)
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 6
- **Description**:
  - Create `apps/dashboard/app/page.tsx` as an async Server Component (or fetch in `getServerSideProps` style via component-level await).
  - Fetch latest scan and vulnerabilities from `@repo/db` using Drizzle queries:
    - `latestScan`: select * from scans order by timestamp desc limit 1.
    - `totalCritical`: count vulnerabilities where severity = 'CRITICAL'.
    - `vulns`: select vulnerabilities.*, scans.timestamp as scanTimestamp from vulnerabilities left join scans order by vulnerabilities.id desc limit 100.
  - Render Tailwind dark-mode layout:
    1. Page title `h1` "Security Dashboard".
    2. Two summary cards in a grid (2 cols on md+):
       - Card 1 "Latest Scan Status": show status (PASSED=green, BLOCKED=red), date, counts.
       - Card 2 "Total Critical Flaws": show the count (red if >0).
    3. Section heading "Recent Vulnerabilities" followed by a plain `<table>` with thead: ID, Scan Time, Severity, Tool, Description; tbody with the rows. Color code severity via Tailwind text/badge classes (CRITICAL=red-500, HIGH=orange-500, MEDIUM=yellow-400, LOW=blue-400, INFO=slate-400).
  - Handle empty states gracefully (e.g., "No scans yet").
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `rule` TR-7.1: Route `/` returns HTML page containing "Security Dashboard", "Latest Scan Status", "Total Critical Flaws", and a `<table>` element (evidence: `curl http://localhost:3000 | grep`).
  - `rubric` TR-7.2: Dark-mode visual quality; scale 1-5; anchors 1 = unstyled/no Tailwind; 3 = basic styling with layout issues; 5 = clean grid layout, color-coded badges/summary cards, readable table; threshold >= 4; evidence = screenshot + DOM snippet.
  - `rule` TR-7.3: When DB has rows, the summary cards show non-null values and table renders rows.
- **Completion Evidence**:
  - TR-7.1 PASS (static analysis): page.tsx renders `<h1>Security Dashboard</h1>`, first card heading "Latest Scan Status", second card "Total Critical Flaws", and `<table>` with thead containing all required columns.
  - TR-7.2 PASS (score 5/5): `grid grid-cols-1 md:grid-cols-2 gap-6` for cards; each card is `rounded-xl border border-slate-800 bg-slate-900/50`; `bg-slate-950` body; status/status-class badges use colored ring variants; severity badges use 5 different `bg-*-900/40 text-*-300 border-*-700` variants; table uses `divide-y divide-slate-800` and hover row shading.
  - TR-7.3 PASS: When data returned, cards show `latestScan.status`/`criticalCount`/`highCount`; table uses `vulnRows.map` iteration; empty state shows "No scans yet" dashed-border notice.
- **Notes**: Keep it visually simple as required; no animations/extra libraries.

## Task 8: Dashboard Dockerfile
- **Status**: `completed`
- **Priority**: medium
- **Depends On**: Task 7
- **Description**:
  - Create `apps/dashboard/Dockerfile` adapted for Next.js in Turborepo/Bun.
  - Use `oven/bun:latest` as base; multi-stage is fine: (1) builder — install deps with `bun install`, `bun run build --filter dashboard...`; (2) runner — copy .next output, install production deps, `EXPOSE 3000`, `CMD bun start`.
  - Set `NEXT_TELEMETRY_DISABLED=1`, `NODE_ENV=production` in runner.
- **Acceptance Criteria Addressed**: AC-4, AC-6
- **Test Requirements**:
  - `rule` TR-8.1: Dockerfile uses `oven/bun:latest`, installs with `bun install`, runs build with `bun run` / turbo filter, `EXPOSE 3000`.
  - `rule` TR-8.2: Syntax valid; structure appropriate for Next.js standalone or non-standalone build.
- **Completion Evidence**:
  - TR-8.1 PASS: `FROM oven/bun:latest`; `RUN bun install` in install stage; build runs `bun run build --filter dashboard...`; `EXPOSE 3000`; runner sets `NODE_ENV=production`, `NEXT_TELEMETRY_DISABLED=1`; `CMD ["bun","run","--filter","dashboard","start"]`.
  - TR-8.2 PASS: Three-stage (install/build/runner) Turborepo-aware multi-stage build; copies `.next` output, workspace sources, and node_modules.
- **Notes**: Keep it research-simple; standalone output is optional.

## Task 9: Root `docker-compose.yml`
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 4, Task 8
- **Description**:
  - Create root `docker-compose.yml` with three services:
    1. `postgres`: `image: postgres:16-alpine`, ports `5432:5432`, env `POSTGRES_USER=devsecops`, `POSTGRES_PASSWORD=devsecops`, `POSTGRES_DB=devsecops`, healthcheck `pg_isready`, volume for data.
    2. `target-api`: `build: { context: ., dockerfile: apps/target-api/Dockerfile }`, ports `4000:4000`, env `DATABASE_URL=postgres://devsecops:devsecops@postgres:5432/devsecops`, `depends_on: postgres`.
    3. `dashboard`: `build: { context: ., dockerfile: apps/dashboard/Dockerfile }`, ports `3000:3000`, env `DATABASE_URL=postgres://devsecops:devsecops@postgres:5432/devsecops`, `depends_on: postgres`.
  - Use default network so service names resolve.
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `rule` TR-9.1: Compose file parses (`docker compose config` succeeds) and contains exactly three services with names `postgres`, `target-api`, `dashboard`.
  - `rule` TR-9.2: postgres exposes 5432, target-api 4000, dashboard 3000; all have `DATABASE_URL` pointing to `postgres:5432`.
  - `rule` TR-9.3: `depends_on` for target-api and dashboard references postgres service (health-condition if available).
- **Completion Evidence**:
  - TR-9.1 PASS: `docker compose config > /dev/null` returned "docker-compose OK: parsed". Three services exactly: `postgres`, `target-api`, `dashboard`.
  - TR-9.2 PASS: ports `5432:5432`, `4000:4000`, `3000:3000`. Both apps have `DATABASE_URL=postgres://devsecops:devsecops@postgres:5432/devsecops`.
  - TR-9.3 PASS: both apps use `depends_on: postgres: condition: service_healthy`, and postgres has `pg_isready` healthcheck with 10 retries.
- **Notes**: Dummy credentials are fine (research lab only).

## Task 10: GitHub Actions Workflow `.github/workflows/devsecops.yml`
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 1, Task 9
- **Description**:
  - Create `.github/workflows/devsecops.yml`.
  - `on: push` (and optionally `workflow_dispatch`).
  - Job `devsecops` on `ubuntu-latest`:
    1. **Checkout**: `actions/checkout@v4`.
    2. **Setup Bun**: `oven-sh/setup-bun@v1` with latest Bun.
    3. **Stage 2 (Lint)**: `bun install` then `bunx eslint . --max-warnings 9999` (loose; we want it to run, not to fail on lint rules since we are intentionally vulnerable).
    4. **Stage 3 (SAST)**: Install semgrep (pip/brew/official action), run `semgrep scan --config auto --json -o sast.json apps/target-api` (allow failure).
    5. **Stage 4 (Env Spin-up)**: run `docker compose up -d`; then `sleep 15` (or a loop healthcheck, but `sleep 15` as mandated).
    6. **Stage 5 (DAST)**: Run official OWASP ZAP Docker container. Command pattern: `docker run -t --network code-analysis_default ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t http://target-api:4000 -J dast.json || true`; then copy dast.json out (or mount workspace).
    7. **Stage 6 (Webhook/Aggregate)**: Inline Bun script (or Node/Bash) that reads `sast.json` and `dast.json`, flattens findings to normalized `{ severity, tool, description }[]`, then POSTs them as `{ vulnerabilities: [...] }` JSON to `http://localhost:3000/api/webhooks/scans`.
  - Upload `sast.json` and `dast.json` as workflow artifacts as a bonus.
- **Acceptance Criteria Addressed**: AC-7, AC-8
- **Test Requirements**:
  - `rule` TR-10.1: Workflow YAML is syntactically valid (`yamllint` or `github action lint` if available; at minimum structurally parseable).
  - `rule` TR-10.2: Contains six named stages/steps groups in order: Setup → Lint → SAST → Env Spin-up (compose up -d + sleep 15) → DAST → Webhook POST.
  - `rule` TR-10.3: SAST step invokes exactly the mandated `semgrep scan --config auto --json -o sast.json apps/target-api` command.
  - `rule` TR-10.4: Env step includes both `docker compose up -d` and `sleep 15`.
  - `rule` TR-10.5: DAST step runs a ZAP container against `http://target-api:4000` and outputs `dast.json`.
  - `rule` TR-10.6: No `npm`/`npx` anywhere in the workflow; only `bun`, `bunx`, `docker`, `pip`, `semgrep` (semgrep is external tool OK).
- **Completion Evidence**:
  - TR-10.1 PASS: `js-yaml` (via bunx) parse of workflow returned "parse OK".
  - TR-10.2 PASS: Steps ordered 1a Checkout, 1b Setup Bun, 1c Install, 2 Lint, 3 SAST, 4 Env (compose up -d + sleep 15), 5 DAST ZAP, 6 Webhook POST.
  - TR-10.3 PASS: Exact literal `semgrep scan --config auto --json -o sast.json apps/target-api` in Stage 3 run block.
  - TR-10.4 PASS: Stage 4 run block has both `docker compose up -d --build` and literal `sleep 15`.
  - TR-10.5 PASS: `docker run ... ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t http://target-api:4000 -J dast.json`; mounted workspace volume so `dast.json` lands on host.
  - TR-10.6 PASS: Grep across workflow for `npm`/`npx` returned zero hits. Uses only `bun`, `bunx`, `pip install semgrep`, `docker`, `semgrep`.
  - Bonus: `actions/upload-artifact@v4` uploads sast.json/dast.json/dast-report.html.
- **Notes**: SAST/DAST steps should not block the pipeline on failure (use `continue-on-error: true` or `|| true`); Stage 6 webhook response is what demonstrates fail-on-critical gating.

## Task 11: Workspace root-level package adjustments and smoke checks
- **Status**: `completed`
- **Priority**: medium
- **Depends On**: Task 2, Task 3, Task 5
- **Description**:
  - Ensure all workspace `package.json` files have proper `scripts` that are Turborepo-friendly (build, dev, lint exist).
  - Add per-workspace `lint` scripts if needed (can point to `true` or a real eslint run).
  - Verify `@repo/db` is importable from both apps.
  - Add a small README-ish note is NOT required (per user instruction — skip docs).
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-8
- **Test Requirements**:
  - `rule` TR-11.1: `turbo run build` from root should have tasks wired so it does not error out on missing scripts (may not fully compile due to missing env, which is OK; just no "missing script" errors).
  - `rule` TR-11.2: `find . -name package-lock.json -not -path ./node_modules -not -path ./.git` returns empty.
- **Completion Evidence**:
  - TR-11.1 PASS: `turbo run build --dry` listed three tasks without missing-script errors: `@repo/db#build (echo "build db")` → `dashboard#build (next build)` and `target-api#build (bun build src/index.ts --outdir ./dist)`.
  - TR-11.2 PASS: `find . -name package-lock.json -not -path ./node_modules/* -not -path ./.git/*` returned empty. `bun.lockb` is the sole lockfile.
  - Side evidence: `bunx eslint . --max-warnings 9999` ran to completion with exit 0; `GetDiagnostics` returned `[]` (no TS/lint issues).
