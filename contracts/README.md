# Warangal Trading Ring — API Contracts

STATUS: **DRAFT — READY FOR ARCHITECTURE REVIEW**
Version: **v1**
Last Updated: 2026-01-01
Owner: Agent 3 (API Contract Architect)

---

## What This Platform Is

**Warangal Trading Ring is a trading competition platform.** Participants submit MARKET orders, and valid orders are immediately executed against the authoritative market price by the Order Execution Service.

**It is NOT an exchange.** There is no order book, no bid/ask participant matching, no counterparty, and no participant-to-participant order matching. Every valid MARKET order is fully filled in a single immediate execution.

**Normal order lifecycle:**
```
POST /orders → PENDING → ACCEPTED → FILLED
```

---

## Purpose

This directory is the single shared communication layer for the Warangal Trading Ring project.

It defines every API endpoint, WebSocket event, error code, schema type, and behavioral rule that the three independently-developed subsystems must satisfy:

| Agent | Role | Consumes |
|-------|------|----------|
| Agent 1 | Frontend | All contracts as a consumer |
| Agent 2 | Backend | All contracts as the implementer |
| Agent 4 | Database | Domain model + persistence requirements embedded in contracts |

No agent needs to wait for another agent. Each agent receives these documents and can work independently. Integration happens after each subsystem is built to contract.

---

## Architecture Overview

```
Participant (browser/app)
        │
        │ HTTPS REST + WebSocket
        ▼
   API Layer (Agent 2)
        │
        ├── Auth + validation
        ├── GET endpoints → read from DB (durable state)
        └── POST /orders → Order Execution Service
                │
                ├── Get authoritative market price
                ├── Execute trade immediately
                ├── Commit to database (Agent 4)
                └── Publish WebSocket events
```

**Architectural boundaries:**
- The **Order Execution Service** executes trades. It is not implemented by any agent — it is an external trading system component.
- The **API Layer** (Agent 2) receives orders, validates them, and forwards them to the Order Execution Service.
- The **Database** (Agent 4) is the durable source of truth for all committed order, position, and balance state.
- The **WebSocket Gateway** pushes real-time notifications. It is NOT the source of truth.
- **Redis** may be used for caching and pub/sub. It is NOT the financial source of truth.
- The **Frontend** (Agent 1) displays values provided by the API. It does NOT compute authoritative financial state.

---

## Directory Layout

```
contracts/
├── README.md            ← you are here
├── conventions.md       ← global naming, timestamp, decimal, ID, execution model rules
│
├── v1/
│   ├── auth.md          ← authentication + authorization endpoints
│   ├── market.md        ← market status, instruments, quotes, candles (10s canonical)
│   ├── orders.md        ← order creation, lifecycle, idempotency (most critical file)
│   ├── positions.md     ← position endpoints (LONG + SHORT)
│   ├── portfolio.md     ← portfolio, balance, P&L endpoints
│   ├── leaderboard.md   ← leaderboard endpoints
│   ├── websocket.md     ← WebSocket protocol, events, reconnect
│   ├── errors.md        ← error codes, HTTP status, standard envelope
│   ├── recovery.md      ← client-visible failure and recovery behavior
│   ├── simulation.md    ← event/simulation/day/market lifecycle, dataset model, cursor
│   ├── admin.md         ← Admin API endpoints and monitoring
│   └── news.md          ← news and announcements
│
└── schemas/
    ├── common.ts        ← shared enums, pagination, envelope types
    ├── auth.ts          ← auth request/response types
    ├── market.ts        ← instrument, quote, candle types (includes 10s timeframe)
    ├── order.ts         ← order request/response/state types
    ├── position.ts      ← position types (LONG + SHORT)
    ├── portfolio.ts     ← portfolio, balance, P&L types
    ├── leaderboard.ts   ← leaderboard entry types
    ├── websocket.ts     ← WebSocket event envelope and payload types
    └── simulation.ts    ← event, simulation, dataset, admin, news, audit types
```

---

## Versioning

All API endpoints are prefixed `/api/v1/`.

A contract version bump to `v2` is required when a **breaking change** is introduced (see `conventions.md`).

Non-breaking additions (new optional fields, new endpoints) do not require a version change but must be documented with an `Added:` entry in the relevant file.

---

## How to Update Contracts

1. Open a discussion with the human architect before modifying any field that affects existing agent implementations.
2. Mark changed sections with `[CHANGED: reason]` inline.
3. If breaking, increment version, add migration notes.
4. All agents must be notified before they consume an updated version.
5. Implementation agents must NOT silently modify contracts. The contracts define the integration boundary — changes require explicit review.

---

## Contract Approval Workflow

```
Agent 3 produces DRAFT contracts
        ↓
Human/architecture review
        ↓
Contracts marked APPROVED (version tag)
        ↓
Delivered to Agent 1, Agent 2, Agent 4
        ↓
Independent implementation
        ↓
Integration + contract tests
        ↓
Production hardening
```

Agent 3 does **NOT** approve its own contracts. The DRAFT status stands until human review.

---

## Agent Responsibilities (Boundaries)

| Responsibility | Agent |
|----------------|-------|
| API contract documents | Agent 3 |
| TypeScript schema types | Agent 3 |
| Frontend UI + API client | Agent 1 |
| Backend API implementation | Agent 2 |
| Database schema + migrations | Agent 4 |
| Order Execution Service (external) | Not in scope for any agent |
| Infrastructure / deployment | Not in scope for any agent |

---

## Breaking vs Non-Breaking Changes

**Breaking** (requires v2, all agents notified):
- Removing a field
- Renaming a field
- Changing a field's type
- Changing HTTP method of an endpoint
- Changing error code semantics

**Non-breaking** (v1, document inline):
- Adding a new optional field to a response
- Adding a new endpoint
- Adding a new error code
- Expanding an enum with a new value (agents must handle unknown enum values gracefully)
