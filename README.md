# music-livereview

A web application that analyzes your Spotify Extended Streaming History. Upload your data, get interactive visualizations, and compare your listening habits against the community.

## Features

- **Upload & Analyze**: Upload your Spotify Extended Streaming History JSON files
- **Interactive Dashboard**: Explore your data with Chart.js visualizations — filter by date range, artist, and more
- **Shareable Results**: Each upload generates a unique link — no account needed
- **Community Stats**: See how your listening compares to others (percentile rankings, global averages, trending artists)

### Visualizations

- Top artists and tracks (by play count or listening time)
- Listening timeline over months/years
- Weekday × hour heatmap ("When do you listen?")
- Artist trends over time (stacked area chart)
- Platform and country distribution
- Discovery vs. repetition rate
- Most skipped tracks

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vue 3, Composition API, Chart.js, Vite |
| Backend | TypeScript, Express.js, Knex |
| Database | PostgreSQL |
| Shared | TypeScript types (npm workspace) |
| Architecture | Hexagonal (Ports & Adapters), DDD |

## Getting Started

### Prerequisites

- Node.js 22+
- Docker (for PostgreSQL)

### Setup

```bash
npm install
npm run dev
```

This starts PostgreSQL via Docker Compose, then runs the backend (`:3000`) and frontend (`:5173`) in parallel. Open [http://localhost:5173](http://localhost:5173).

> Migrations run automatically on backend startup.

## Project Structure

```
packages/shared/    — Shared TypeScript types (API contracts, Spotify schema)
backend/            — Express API with hexagonal architecture
  src/domain/       — Pure domain model (entities, value objects, port interfaces)
  src/application/  — Use case implementations
  src/adapter/      — HTTP controllers, Postgres repositories
frontend/           — Vue 3 SPA with composables
  src/views/        — Page components
  src/composables/  — Reusable logic (useFileUpload, useFilters, useChartData, etc.)
  src/components/   — Chart and UI components
```

## How to Get Your Spotify Data

1. Go to [Spotify Privacy Settings](https://www.spotify.com/account/privacy/)
2. Request "Extended streaming history"
3. Wait for the email (can take up to 30 days)
4. Download and extract the ZIP
5. Upload the `Streaming_History_Audio_*.json` files

## Claude Code Best Practices

This project uses [Claude Code](https://claude.com/claude-code) for development. See [CLAUDE.md](CLAUDE.md) for project-specific rules that Claude reads automatically.

### Key files for AI-assisted development:

- **`CLAUDE.md`** — Project rules, conventions, and architecture guidelines that Claude reads every session
- **`.gitignore`** — Ensures sensitive data and build artifacts are never committed
- **`packages/shared/`** — Shared types keep frontend and backend in sync

### Tips for working with Claude Code on this project:

- Reference the hexagonal architecture: "add a new port in `domain/port/outbound/`"
- Keep domain logic pure: "implement this in the use case, not the controller"
- Use composables for new frontend features: "create a `useNewFeature.ts` composable"
