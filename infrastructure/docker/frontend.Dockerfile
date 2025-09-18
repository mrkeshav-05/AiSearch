# Multi-stage build for development and production
FROM node:18-alpine AS base

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files and lockfile
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY shared/package.json ./shared/
COPY frontend/package.json ./frontend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Development stage
FROM base AS development

# Copy source code
COPY shared ./shared/
COPY frontend ./frontend/

# Build shared package first
RUN pnpm --filter @aisearch/shared run build

# Expose port
EXPOSE 3000

# Start development server with hot reload
CMD ["pnpm", "run", "dev:frontend"]

# Build stage
FROM base AS builder

# Copy source code
COPY shared ./shared/
COPY frontend ./frontend/

# Build shared package first
RUN pnpm --filter @aisearch/shared run build

# Build frontend
RUN pnpm --filter @aisearch/frontend run build

# Production stage
FROM node:18-alpine AS production

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files and lockfile
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY frontend/package.json ./frontend/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=builder /app/frontend/.next ./frontend/.next
COPY --from=builder /app/frontend/public ./frontend/public
COPY --from=builder /app/frontend/next.config.ts ./frontend/

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["pnpm", "run", "start:frontend"]