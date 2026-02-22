# CLAUDE.md — Project Rules for Claude Code

## Project Overview

Full-stack web app for analyzing Spotify Extended Streaming History data. Users upload their Spotify data export (JSON files), receive interactive Chart.js visualizations, and can compare against community-wide anonymous statistics. No accounts — access via unique shareable links.

## Architecture

- **Monorepo** with npm workspaces: `packages/shared`, `backend`, `frontend`
- **Backend**: TypeScript, Express.js, Knex (query builder), PostgreSQL
  - Hexagonal Architecture (Ports & Adapters)
  - Object-Oriented Domain-Driven Design
  - Domain layer is pure — no framework dependencies
- **Frontend**: Vue 3 (Composition API + composables), Chart.js, Vite, Vue Router
- **Database**: PostgreSQL with materialized views for community stats

## Project Structure

```
packages/shared/src/     → Shared TypeScript types (Spotify schema, API contracts, constants)
backend/src/
  domain/model/          → Entities & value objects (UploadSession, StreamEntry, ShareToken, etc.)
  domain/port/inbound/   → Use case interfaces
  domain/port/outbound/  → Repository & infrastructure interfaces
  application/           → Use case implementations
  adapter/inbound/http/  → Express controllers & middleware
  adapter/outbound/      → Postgres repositories, token generator
  config/                → Database & environment config
frontend/src/
  views/                 → Page components (Home, Upload, Dashboard, Community)
  components/            → UI components organized by feature
  composables/           → Vue composables (useFileUpload, useFilters, useChartData, etc.)
  services/              → API client
```

## Key Conventions

- Domain layer (`domain/`) must have ZERO framework imports — only pure TypeScript
- All persistence goes through port interfaces, never direct DB access from use cases
- API responses use camelCase, database columns use snake_case
- Knex query builder for SQL — no ORM. Raw SQL is fine for complex aggregation queries
- Frontend composables follow `use<Name>.ts` naming convention
- Chart components receive data as props — composables handle API fetching

## Common Commands

```bash
docker compose up -d                    # Start PostgreSQL
npm install                             # Install all workspace dependencies
npm run dev:backend                     # Start backend dev server (port 3000)
npm run dev:frontend                    # Start frontend dev server (port 5173)
npm run migrate --workspace=backend     # Run database migrations
```

## Spotify Data Schema

Key fields per stream entry: `ts`, `master_metadata_track_name`, `master_metadata_album_artist_name`, `master_metadata_album_album_name`, `ms_played`, `spotify_track_uri`, `reason_start`, `reason_end`, `shuffle`, `skipped`, `platform`, `conn_country`.

PII fields (`username`, `ip_addr_decrypted`, `user_agent_decrypted`, `offline_timestamp`, `incognito_mode`) are stripped during ingestion.

## Known Gotchas

- The `ts` field in Spotify exports is an ISO string — always parse with `new Date(ts)`
- `ms_played` can be 0 for entries where a track was opened but not played
- `master_metadata_*` fields are null for podcast episodes
- `skipped` can be null (not just true/false) in older exports
- Materialized views need `REFRESH MATERIALIZED VIEW CONCURRENTLY` — requires unique indexes

## Do NOT

- Import framework code (Express, Knex, etc.) in the domain layer
- Store PII fields from Spotify exports in the database
- Commit `.env` files, JSON data files, or `node_modules`
- Use an ORM — use Knex query builder or raw SQL
