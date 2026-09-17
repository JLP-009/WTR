# Warangal Trading Ring

The React/Vite frontend remains in [`frontend/`](frontend/). The contract-driven Fastify backend foundation is in [`backend/`](backend/). API contracts are in [`contracts/`](contracts/).

## Phase 1 local development

```bash
cp backend/.env.example backend/.env
cd backend && npm install && npm run dev
```

The backend health endpoint is `GET http://localhost:3000/health`. PostgreSQL development infrastructure is available via `docker compose up postgres`; apply the Phase 2 schema with `cd backend && npm run db:migrate`, then run the explicit seed scripts as documented in `backend/README.md`.

See [`docs/contract-frontend-backend-mapping.md`](docs/contract-frontend-backend-mapping.md) and [`docs/backend-architecture.md`](docs/backend-architecture.md) for the inspection and design records.
