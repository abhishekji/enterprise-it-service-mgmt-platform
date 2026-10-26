# Enterprise IT Service Management Platform

MERN-based ITSM platform (incidents, service requests, assets, workflow/SLA automation) built as
**microservices** + **micro frontends**, each service with its **own MongoDB**, wired by **Kafka** events and **Redis**.

## Architecture

| Component | Port | Notes |
|---|---|---|
| `apps/shell` | 3000 | Module Federation host: login, navigation, loads remotes |
| `apps/mfe-incidents` / `mfe-requests` / `mfe-assets` | 3001 / 3002 / 3003 | Remotes (also run standalone) |
| `services/api-gateway` | 4000 | Proxy + Redis rate limiting |
| `services/auth-service` | 4001 | Users, JWT, roles → `mongo-auth` (27022) |
| `services/incident-service` | 4002 | Incidents, Redis-cached stats → `mongo-incident` (27018) |
| `services/request-service` | 4003 | Requests + approvals → `mongo-request` (27019) |
| `services/asset-service` | 4004 | Assets, expiring certs → `mongo-asset` (27020) |
| `services/workflow-service` | 4005 | SLA timers, breach detection, audit log → `mongo-workflow` (27021) |
| `packages/common` | – | Shared Express/Mongo/Kafka/Redis/JWT helpers |
| Kafka (KRaft) / Redis | 9092 / 6379 | |

Event flow: `incident.created` → workflow starts SLA timer → on overdue emits `incident.sla_breached`
→ incident-service flags `slaBreached`. Requests/assets/incident updates are also audited by workflow-service.

Roles: `admin`, `agent`, `approver`, `requester` (self-registration yields `requester`).

## Run locally

```bash
npm install
npm run infra:up        # Kafka, Redis, 5 MongoDBs
npm run seed            # demo users, password: Password123!
npm run dev             # all services + all frontends
```

Open http://localhost:3000 — log in as `admin@itsm.local`, `agent@itsm.local`,
`approver@itsm.local` or `user@itsm.local`.

## Run everything in Docker

```bash
npm run stack:up
```

(Then seed with `npm run seed` from the host.) Copy `.env.example` to `.env` to override secrets; change `JWT_SECRET` outside dev.

## Next steps

Ticket comments/attachments, notifications service, email/Slack integrations, workflow definition engine,
tests and CI, per-service Dockerfile hardening, TLS and secret management.
