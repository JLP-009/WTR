# Warangal Trading Ring backend

Phases 1–2 supply the Fastify foundation and contract-derived PostgreSQL/Drizzle schema. Authentication, lifecycle, market, and trading modules begin in later approved phases.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

The operational health check is `GET /health`. It returns the standard response envelope and a request ID. The contractual API will be mounted beneath `/api/v1` as modules are implemented.

## Local PostgreSQL

From the repository root:

```bash
docker compose up postgres
```

Apply the Phase 2 schema with `npm run db:migrate`. Seed the development dataset with `npm run db:seed`; explicitly set `SEED_ADMIN_PASSWORD` or `SEED_PARTICIPANT_PASSWORD` before running their corresponding seed scripts.

## Checks

```bash
npm run typecheck
npm run lint
npm test
```
