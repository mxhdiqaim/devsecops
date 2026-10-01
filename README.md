# DevSecOps Pipeline

A monorepo DevSecOps pipeline project built with **Turborepo** and **Bun**, featuring a Next.js dashboard, an Elysia API, and a shared PostgreSQL database layer powered by Drizzle ORM.

## Project Structure

```
devsecops/
├── apps/
│   ├── dashboard/       # Next.js 14 frontend dashboard (port 3000)
│   └── target-api/      # Elysia (Bun) API server (port 4000)
├── packages/
│   └── db/              # Shared Drizzle ORM schema & database client
├── scripts/
│   └── simulate-scan.ts # Script to simulate a security scan webhook
├── docker-compose.yml   # PostgreSQL + full-stack Docker setup
├── turbo.json           # Turborepo pipeline configuration
└── package.json         # Root workspace scripts
```

## Prerequisites

Make sure the following are installed on your machine:

| Tool | Version | Install |
|------|---------|---------|
| [Bun](https://bun.sh) | ≥ 1.0.0 | `curl -fsSL https://bun.sh/install \| bash` |
| [Docker](https://www.docker.com/get-started) | Latest | [docker.com](https://www.docker.com/get-started) |
| [Docker Compose](https://docs.docker.com/compose/) | Latest | Included with Docker Desktop |

---

## Getting Started (Local Development)

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd devsecops
```

### 2. Install dependencies

```bash
bun install
```

### 3. Start the database

Spin up a local PostgreSQL instance using Docker:

```bash
docker compose up postgres -d
```

This starts a PostgreSQL 16 container with:
- **Host:** `localhost:5432`
- **User:** `devsecops`
- **Password:** `devsecops`
- **Database:** `devsecops`

### 4. Set up environment variables

Create a `.env` file in the root (or in each app) with the database connection string:

```bash
# .env
DATABASE_URL=postgres://devsecops:devsecops@localhost:5432/devsecops
```

> The default connection string is already pre-configured in `drizzle.config.ts`, so this step is only needed if you change the database credentials.

### 5. Run database migrations

Push the Drizzle schema to the database:

```bash
bun run db:push
```

Or generate and apply migration files:

```bash
bun run db:generate
bun run db:migrate
```

### 6. Seed the database (optional)

Populate the database with dummy users:

```bash
bun run db:seed
```

This inserts the following test users:
- `admin@example.com`
- `adam@example.com`
- `john@example.com`

### 7. Start the development servers

Run all apps in parallel with hot reload:

```bash
bun run dev
```

This starts:
- **Dashboard** → [http://localhost:3000](http://localhost:3000) (Next.js)
- **Target API** → [http://localhost:4000](http://localhost:4000) (Elysia/Bun)

---

## Running with Docker (Full Stack)

To run the entire stack (PostgreSQL + dashboard + target-api) in containers:

```bash
docker compose up --build
```

| Service | URL |
|---------|-----|
| Dashboard | [http://localhost:3000](http://localhost:3000) |
| Target API | [http://localhost:4000](http://localhost:4000) |

To stop all services:

```bash
docker compose down
```

To stop and remove volumes (wipes the database):

```bash
docker compose down -v
```

---

## Available Scripts

All scripts are run from the **repository root**:

| Script | Description |
|--------|-------------|
| `bun run dev` | Start all apps in development mode (parallel, with hot reload) |
| `bun run build` | Build all apps for production |
| `bun run lint` | Lint all apps and packages |
| `bun run db:generate` | Generate Drizzle migration files |
| `bun run db:migrate` | Apply migrations to the database |
| `bun run db:push` | Push schema directly to the database (no migration files) |
| `bun run db:seed` | Seed the database with dummy users |
| `bun run scan:test` | Simulate a security scan webhook to the dashboard |
| `bun run format` | Format all `.ts`, `.tsx`, and `.md` files with Prettier |

---

## Simulating a Security Scan

With the full stack running, you can simulate a DAST/SAST scan report being sent to the dashboard:

```bash
bun run scan:test
```

This sends a `POST` request to `http://localhost:3000/api/webhooks/scans` with a sample vulnerability payload containing:
- A **CRITICAL** SQL Injection finding (OWASP ZAP)
- A **HIGH** XSS finding (OWASP ZAP)
- A **HIGH** hardcoded secrets finding (Semgrep)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | [Turborepo](https://turbo.build) + [Bun Workspaces](https://bun.sh/docs/install/workspaces) |
| Frontend | [Next.js 14](https://nextjs.org) + [Tailwind CSS](https://tailwindcss.com) |
| Backend | [Elysia](https://elysiajs.com) on [Bun](https://bun.sh) |
| Database | [PostgreSQL 16](https://www.postgresql.org) |
| ORM | [Drizzle ORM](https://orm.drizzle.team) |
| Runtime | [Bun](https://bun.sh) ≥ 1.0.0 |
| Containerisation | [Docker](https://www.docker.com) + [Docker Compose](https://docs.docker.com/compose/) |
