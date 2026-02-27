# Use Bun for dependency installation (supports workspace protocol)
FROM oven/bun:1 AS deps
WORKDIR /app

# Copy root package files and all package.json files
COPY package.json bun.lock ./
COPY packages/config/package.json ./packages/config/
COPY packages/core/package.json ./packages/core/
COPY packages/schema/package.json ./packages/schema/
COPY packages/sdk/package.json ./packages/sdk/
COPY apps/dashboard/package.json ./apps/dashboard/

# Install dependencies using Bun (handles workspace protocol)
RUN bun install --frozen-lockfile

# Build stage
FROM oven/bun:1 AS builder
WORKDIR /app

# Copy dependencies from Bun stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY package.json bun.lock ./
COPY packages ./packages
COPY apps/dashboard ./apps/dashboard
COPY tsconfig.json ./

# Build workspace packages required by the dashboard
RUN bun run build:packages

# Build the dashboard
WORKDIR /app/apps/dashboard
ENV NEXT_TELEMETRY_DISABLED=1

# Create .env file from example if it doesn't exist (required for build)
RUN if [ ! -f .env ]; then cp .env.example .env; fi

RUN bun run build

# Ensure public directory exists (even if empty)
RUN mkdir -p public

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application from standalone output
COPY --from=builder --chown=nextjs:nodejs /app/apps/dashboard/public ./apps/dashboard/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/dashboard/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/dashboard/.next/static ./apps/dashboard/.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

CMD ["node", "apps/dashboard/server.js"]
