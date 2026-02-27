# Use Bun base image
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies stage
FROM base AS deps
WORKDIR /app

# Copy root package.json and workspace files
COPY package.json bun.lock ./
COPY packages/config/package.json ./packages/config/
COPY packages/core/package.json ./packages/core/
COPY packages/database/package.json ./packages/database/
COPY packages/schema/package.json ./packages/schema/
COPY packages/sdk/package.json ./packages/sdk/
COPY services/api/package.json ./services/api/

# Install dependencies (workspace install)
RUN bun install --frozen-lockfile

# Build stage
FROM base AS builder
WORKDIR /app

# Copy dependencies (workspace-level node_modules)
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY package.json bun.lock ./
COPY packages ./packages
COPY services/api ./services/api
COPY tsconfig.json ./

# Build workspace packages required by the service
WORKDIR /app
RUN bun run build:packages
RUN cd packages/database && bun run build

# Build the service
WORKDIR /app/services/api
RUN bun run build

# Production stage
FROM oven/bun:1-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user (Debian-based image)
RUN groupadd --system --gid 1001 lumina && \
    useradd --system --uid 1001 --gid lumina lumina

# Copy built application
COPY --from=builder --chown=lumina:lumina /app/services/api/src ./src
COPY --from=builder --chown=lumina:lumina /app/services/api/package.json ./
COPY --from=builder --chown=lumina:lumina /app/node_modules ./node_modules
COPY --from=builder --chown=lumina:lumina /app/packages ./packages

USER lumina

EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun --eval "fetch('http://localhost:8081/health').then(r => r.ok ? process.exit(0) : process.exit(1))" || exit 1

CMD ["bun", "run", "src/server.ts"]
