# --- Build stage ---
FROM node:22-alpine AS build
WORKDIR /app

# Copy workspace manifests first for layer caching
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY package.json package-lock.json tsconfig.base.json ./

RUN npm ci

# Copy source
COPY packages/shared/ ./packages/shared/
COPY backend/ ./backend/

# Build shared first (backend has a project reference to it), then backend
RUN npm run build --workspace=packages/shared && \
    npm run build --workspace=backend && \
    npm prune --omit=dev

# --- Production stage ---
FROM node:22-alpine
WORKDIR /app

# Package manifests needed for workspace symlink resolution at runtime
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY backend/package.json ./backend/

# Pruned node_modules (workspace symlinks intact)
COPY --from=build /app/node_modules ./node_modules

# Shared package compiled output (symlink target: node_modules/@music-livereview/shared -> packages/shared)
COPY --from=build /app/packages/shared/dist ./packages/shared/dist

# Backend compiled output
COPY --from=build /app/backend/dist ./backend/dist

# SQL migrations are not copied by tsc — place them where run-migrations.js expects them
# run-migrations.js resolves migrations via __dirname, which is backend/dist/adapter/outbound/persistence/
COPY backend/src/adapter/outbound/persistence/migrations \
     ./backend/dist/adapter/outbound/persistence/migrations

# Font files for OG image generation (tsc doesn't copy non-TS assets)
COPY backend/src/adapter/outbound/og/fonts \
     ./backend/dist/adapter/outbound/og/fonts

COPY backend/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/docker-entrypoint.sh"]
