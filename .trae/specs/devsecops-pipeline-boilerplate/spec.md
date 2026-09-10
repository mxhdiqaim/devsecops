# DevSecOps Pipeline Integration - Product Requirements Document

## Overview
- **Summary**: Generate a bare-bones university research project boilerplate demonstrating a complete DevSecOps pipeline using a Turborepo + Bun monorepo. Includes a deliberately vulnerable target API, a security dashboard with fail-on-critical webhook, Docker orchestration, and a GitHub Actions CI/CD pipeline with linting, SAST, DAST, and webhook aggregation stages.
- **Purpose**: Provide a reproducible, hands-on lab environment for researching and benchmarking DevSecOps toolchains (linting, SAST via Semgrep, DAST via OWASP ZAP, vulnerability aggregation with fail-on-critical gating).
- **Target Users**: University researchers, students, and DevSecOps practitioners evaluating pipeline integration patterns.

## Goals
- Establish a unified Turborepo + Bun monorepo structure with proper workspace configuration.
- Provide a shared PostgreSQL + Drizzle ORM database package used by both applications.
- Deploy a deliberately vulnerable ElysiaJS "Target API" with known weaknesses (hardcoded secret, SQLi, XSS) that SAST and DAST tools can reliably detect.
- Deploy a Next.js Security Dashboard that receives scan results via webhook, stores them in the shared DB, applies fail-on-critical logic, and visualizes the data.
- Orchestrate Postgres, Target API, and Dashboard with Docker Compose.
- Define a GitHub Actions workflow that runs lint → SAST → environment spin-up → DAST → webhook aggregation on every push.

## Non-Goals
- Production-grade hardening of the Target API (it is intentionally vulnerable).
- Real authentication, authorization, or multi-tenancy.
- Sophisticated UI/UX beyond a clean dark-mode dashboard with summary cards and table.
- CI artifact persistence beyond what the pipeline steps directly produce.
- Deployment, hosting, or cloud integration (AWS keys are dummy strings only for detection).

## Background & Context
- Repository is currently empty. Bun is the mandated single runtime and package manager (no npm/npx/package-lock.json).
- User prefers explicit, side-by-side implementations for benchmarking, and lightweight dependencies.

## Functional Requirements

### FR-1: Monorepo Root Configuration
- **FR-1.1**: Root `package.json` configures Bun workspaces for `apps/*` and `packages/*`, and declares Turborepo scripts.
- **FR-1.2**: Root `turbo.json` defines a standard pipeline with build, dev, lint tasks.
- **FR-1.3**: Root `tsconfig.json` provides shared TypeScript base settings.

### FR-2: Shared Database Package (`packages/db`)
- **FR-2.1**: Declares `drizzle-orm`, `drizzle-kit`, and Postgres driver (`postgres` / `pg`) dependencies.
- **FR-2.2**: `schema.ts` defines three tables: `users` (id, email, password), `scans` (id, timestamp, status, criticalCount, highCount), and `vulnerabilities` (id, scanId, severity, tool, description), with proper Drizzle relations/foreign keys.
- **FR-2.3**: Exports a Drizzle connection instance built on Bun's native `postgres` client (or `pg` if native client is unavailable).
- **FR-2.4**: Provides package entry points (main/types) and exports.

### FR-3: Target API (`apps/target-api`) — Port 4000
- **FR-3.1**: ElysiaJS + Bun + TypeScript application running on port 4000.
- **FR-3.2**: Contains a hardcoded dummy AWS access key constant string in the main source file so SAST (Semgrep) catches it.
- **FR-3.3**: `GET /users?email=` endpoint executes a raw, unparameterized SQL template string query (no Drizzle safe query builder) against the shared DB to ensure OWASP ZAP SQLi exploitation succeeds.
- **FR-3.4**: `GET /echo?html=` endpoint sets `Content-Type: text/html` and returns the raw unsanitized `html` query parameter for XSS exploitation.
- **FR-3.5**: Includes a Dockerfile using `oven/bun:latest` that installs workspace deps via Bun and starts the app.

### FR-4: Security Dashboard (`apps/dashboard`) — Port 3000
- **FR-4.1**: Next.js (App Router) + Tailwind CSS + TypeScript application on port 3000.
- **FR-4.2**: `POST /api/webhooks/scans` accepts JSON with an array of vulnerabilities, implements **Fail-on-Critical** logic: if any vulnerability has severity `CRITICAL` or `HIGH`, save the scan + vulnerabilities to shared DB and return `HTTP 403 Forbidden`; otherwise save and return `HTTP 200 OK`.
- **FR-4.3**: `app/page.tsx` renders a Tailwind dark-mode dashboard with summary cards (Latest Scan Status, Total Critical Flaws) and a simple HTML `<table>` listing vulnerabilities fetched from Drizzle.
- **FR-4.4**: Includes a Dockerfile adapted for Next.js in a Turborepo/Bun environment (multi-stage if appropriate, Bun install, next build/start).

### FR-5: Docker Compose Infrastructure
- **FR-5.1**: Root `docker-compose.yml` defines services: `postgres` (expose 5432, dummy credentials), `target-api` (build + expose 4000), `dashboard` (build + expose 3000).
- **FR-5.2**: Proper `depends_on`, network, and environment wiring so apps can reach Postgres and each other via service names.

### FR-6: GitHub Actions CI/CD (`.github/workflows/devsecops.yml`)
- **FR-6.1**: Triggers on every `push`.
- **FR-6.2**: Stage 1 (Checkout & Setup): checks out code, installs Bun.
- **FR-6.3**: Stage 2 (Linting): runs `bunx eslint .` across the workspace.
- **FR-6.4**: Stage 3 (SAST): runs `semgrep scan --config auto --json -o sast.json apps/target-api`.
- **FR-6.5**: Stage 4 (Environment Spin-up): runs `docker compose up -d`, then `sleep 15`.
- **FR-6.6**: Stage 5 (DAST): runs official OWASP ZAP Docker container against `http://target-api:4000`, outputs results to `dast.json`.
- **FR-6.7**: Stage 6 (Webhook/Aggregate): inline shell or Bun script that POSTs the JSON results to `http://localhost:3000/api/webhooks/scans`.

## Non-Functional Requirements
- **NFR-1**: All TypeScript across every workspace compiles cleanly with `tsc --noEmit` (or equivalent workspace scripts).
- **NFR-2**: `bun install` succeeds at the monorepo root without npm/npx fallbacks and without generating a `package-lock.json`.
- **NFR-3**: `docker compose up --build` from a clean clone starts Postgres, Dashboard, and Target API without missing env/config errors.
- **NFR-4**: Target API vulnerabilities are real enough that Semgrep and OWASP ZAP produce non-empty findings when run per the workflow.
- **NFR-5**: Architecture is kept highly functional but visually simple to minimize wiring errors; no unnecessary abstractions.

## Constraints
- **Technical**: Bun as single package manager/runtime; TypeScript everywhere; Drizzle ORM with Postgres; ElysiaJS for Target API; Next.js App Router + Tailwind for Dashboard; Turborepo task orchestration.
- **Business**: Dummy credentials only (no real secrets committed, but one fake AWS hardcoded string is intentionally placed for detection).
- **Dependencies**: `drizzle-orm`, `drizzle-kit`, `postgres` (or `pg`), `elysia`, `next@14+`, `tailwindcss`, `turbo`.

## Assumptions
- Bun is installed in the target environment (or via `oven/bun:latest` image).
- Postgres client connectivity works via standard `POSTGRES_URL`/`DATABASE_URL` env.
- GitHub Actions runner has Docker-in-Docker or access to Docker for compose + ZAP container runs.
- ZAP baseline or full scan produces a JSON output file usable by Stage 6.
- Shared DB package is referenced by apps via workspace protocol (e.g., `"@repo/db": "workspace:*"`).

## Acceptance Criteria

### AC-1: Monorepo structure and root configuration is correct
- **Type**: `rule`
- **Given**: An empty repo root after implementation
- **When**: Inspecting the root directory
- **Then**: `package.json` (with workspaces `apps/*` + `packages/*`), `turbo.json`, `tsconfig.json`, `docker-compose.yml`, and `.github/workflows/devsecops.yml` exist
- **Pass Condition**: All six root files/directories exist with the required content shape and bun workspaces resolve
- **Evidence**: `ls -la` listing + `cat` of each root file + `bun install` output

### AC-2: Shared DB package exports schema and connection
- **Type**: `rule`
- **Given**: `packages/db` exists
- **When**: Opening `schema.ts` and the index/connection file
- **Then**: Three tables (`users`, `scans`, `vulnerabilities`) are defined with correct columns and a Drizzle instance is exported
- **Pass Condition**: `schema.ts` contains all three tables with required columns; connection module exports a `db` instance; package.json exposes entry points
- **Evidence**: File contents of `packages/db/schema.ts`, `packages/db/index.ts`, and `packages/db/package.json`

### AC-3: Target API exposes all three vulnerabilities correctly
- **Type**: `rule`
- **Given**: Target API running on port 4000
- **When**: (a) grep main source for hardcoded AWS-style constant; (b) hit `GET /users?email=' OR 1=1 --`; (c) hit `GET /echo?html=<script>alert(1)</script>`
- **Then**: (a) constant present; (b) raw SQL string concatenation used and endpoint returns rows without parameterization; (c) `Content-Type: text/html` and unsanitized script echoed back
- **Pass Condition**: All three checks observed in code or via HTTP response
- **Evidence**: Source code excerpts + `curl` responses for `/users` and `/echo` endpoints

### AC-4: Dashboard webhook enforces Fail-on-Critical
- **Type**: `rule`
- **Given**: Dashboard running on port 3000 with DB access
- **When**: POSTing (Case A) payload with CRITICAL vulnerability; (Case B) payload with only LOW/INFO
- **Then**: Case A returns 403 and writes scan+vulns to DB; Case B returns 200 and writes scan+vulns to DB
- **Pass Condition**: HTTP status codes match expectations; DB rows created for both cases
- **Evidence**: `curl -v` outputs for both cases + query of scans/vulnerabilities tables afterward

### AC-5: Dashboard UI renders dark-mode summary cards + vulnerability table
- **Type**: `rubric`
- **Dimension**: Dashboard visual and functional completeness
- **Scale**: 1-5
- **Anchors**: 1 = missing elements / unstyled; 3 = present but rough styling; 5 = clean dark-mode Tailwind UI with summary cards + working table populated from DB
- **Pass Threshold**: >= 4
- **Evidence**: HTTP GET of `/` page content + screenshot / DOM inspection showing Tailwind dark classes, two summary cards, and `<table>` with vulnerability rows

### AC-6: Docker Compose starts all three services successfully
- **Type**: `rule`
- **Given**: Fresh clone with Docker available
- **When**: Running `docker compose up --build -d` then `sleep 20` then probing ports 5432, 4000, 3000
- **Then**: All three containers healthy and responding
- **Pass Condition**: `docker compose ps` shows all three services `Up`; curl on ports 4000 and 3000 returns HTTP responses; psql/telnet on 5432 connects
- **Evidence**: `docker compose ps`, curl outputs for 4000/3000, postgres port check

### AC-7: GitHub workflow runs all six stages in order
- **Type**: `rule`
- **Given**: `.github/workflows/devsecops.yml` committed and a push event
- **When**: Inspecting the workflow YAML
- **Then**: Sequential stages exist: Checkout+Setup Bun → Lint → SAST → Env Spin-up (compose + sleep 15) → DAST (ZAP container → dast.json) → Webhook POST
- **Pass Condition**: All six stages present in YAML with correct commands; workflow triggers on push
- **Evidence**: Full `devsecops.yml` file content

### AC-8: Bun-only toolchain without npm/npx/package-lock.json
- **Type**: `rule`
- **Given**: Monorepo after `bun install`
- **When**: Checking for lockfiles and package manager calls in scripts/workflow
- **Then**: No `package-lock.json` or `npm`/`npx` commands anywhere; only `bun`, `bunx`, `bun run` used
- **Pass Condition**: `find . -name package-lock.json` returns nothing; grep across scripts/workflows shows no `npm ` or `npx ` (except maybe inside docker images not controlled by us)
- **Evidence**: `find` command output + grep of all package.json scripts and workflow YAML

## Open Questions
- [ ] Should ZAP run in baseline mode, full scan mode, or a specific scriptable mode? (Assume baseline + JSON export for now; tunable by researcher.)
- [ ] What exact shape should the webhook JSON payload take when Stage 6 POSTs SAST + DAST results? (Assume flat `[{severity, tool, description}, ...]` array with severity normalized to CRITICAL/HIGH/MEDIUM/LOW/INFO.)
- [ ] Are workspace package names `@repo/db`, `target-api`, `dashboard` acceptable? (Assume yes.)
