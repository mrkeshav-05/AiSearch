# Docker Deployment Guide

Complete guide for containerized deployment of AiSearch using Docker and Docker Compose.

## Quick Start with Automation

### 🚀 One-Command Docker Deployment

```bash
# Start complete containerized environment
./scripts/start.sh --docker
```

This automation script:
- ✅ Builds all Docker images
- ✅ Starts all services with proper networking
- ✅ Sets up environment configuration
- ✅ Provides service URLs and monitoring

### 🛑 Clean Shutdown

```bash
# Stop all containers and cleanup
./scripts/stop.sh
```

## Manual Docker Deployment

### Development Environment

#### Start All Services
```bash
# Build and start all services
docker compose up --build

# Run in background (detached mode)
docker compose up -d --build

# View logs
docker compose logs -f

# Stop services
docker compose down
```

#### Individual Service Management
```bash
# Start specific service
docker compose up backend
docker compose up frontend
docker compose up searxng

# Scale services
docker compose up --scale backend=2

# Restart service
docker compose restart backend
```

### Production Environment

#### Build Production Images
```bash
# Build optimized production images
docker compose -f docker-compose.prod.yml build

# Build specific service
docker compose -f docker-compose.prod.yml build backend
```

#### Deploy Production
```bash
# Start production environment
docker compose -f docker-compose.prod.yml up -d

# Check status
docker compose -f docker-compose.prod.yml ps

# View production logs
docker compose -f docker-compose.prod.yml logs -f backend
```

## Docker Configuration

### Docker Compose Files

#### Development (`docker-compose.yml`)
```yaml
version: '3.8'
services:
  backend:
    build:
      context: .
      dockerfile: infrastructure/docker/backend.Dockerfile
      target: development
    ports:
      - "8000:8000"
    environment:
      - NODE_ENV=development
    volumes:
      - ./backend:/app/backend
      - ./shared:/app/shared
    depends_on:
      - searxng

  frontend:
    build:
      context: .
      dockerfile: infrastructure/docker/frontend.Dockerfile
      target: development
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
    volumes:
      - ./frontend:/app/frontend
      - ./shared:/app/shared
    depends_on:
      - backend

  searxng:
    image: searxng/searxng:latest
    ports:
      - "4000:8080"
    volumes:
      - ./settings.yml:/etc/searxng/settings.yml
```

#### Production (`docker-compose.prod.yml`)
```yaml
version: '3.8'
services:
  backend:
    build:
      context: .
      dockerfile: infrastructure/docker/backend.Dockerfile
      target: production
    ports:
      - "8000:8000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: .
      dockerfile: infrastructure/docker/frontend.Dockerfile
      target: production
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    depends_on:
      - backend

  searxng:
    image: searxng/searxng:latest
    ports:
      - "4000:8080"
    volumes:
      - ./settings.yml:/etc/searxng/settings.yml
    restart: unless-stopped
```

### Dockerfile Architecture

#### Backend Dockerfile (`infrastructure/docker/backend.Dockerfile`)
```dockerfile
# Multi-stage build for optimization
FROM node:18-alpine AS base
WORKDIR /app
RUN npm install -g pnpm

# Dependencies stage
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/
COPY shared/package.json ./shared/
RUN pnpm install --frozen-lockfile

# Development stage
FROM deps AS development
COPY . .
RUN pnpm run build:shared
EXPOSE 8000
CMD ["pnpm", "run", "dev:backend"]

# Build stage
FROM deps AS builder
COPY . .
RUN pnpm run build:shared
RUN pnpm run build:backend

# Production stage
FROM node:18-alpine AS production
WORKDIR /app
RUN npm install -g pnpm
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/package.json ./backend/
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/shared/package.json ./shared/
RUN pnpm install --prod --frozen-lockfile
EXPOSE 8000
CMD ["node", "backend/dist/index.js"]
```

#### Frontend Dockerfile (`infrastructure/docker/frontend.Dockerfile`)
```dockerfile
FROM node:18-alpine AS base
WORKDIR /app
RUN npm install -g pnpm

# Dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json ./frontend/
COPY shared/package.json ./shared/
RUN pnpm install --frozen-lockfile

# Development
FROM deps AS development
COPY . .
RUN pnpm run build:shared
EXPOSE 3000
CMD ["pnpm", "run", "dev:frontend"]

# Builder
FROM deps AS builder
COPY . .
RUN pnpm run build:shared
RUN pnpm run build:frontend

# Production
FROM node:18-alpine AS production
WORKDIR /app
RUN npm install -g pnpm
COPY --from=builder /app/frontend/.next ./frontend/.next
COPY --from=builder /app/frontend/package.json ./frontend/
COPY --from=builder /app/frontend/public ./frontend/public
COPY --from=builder /app/package.json ./
RUN pnpm install --prod --frozen-lockfile
EXPOSE 3000
CMD ["pnpm", "run", "start:frontend"]
```

## Environment Configuration

### Backend Environment (`.env`)
```bash
# Production Backend Configuration
NODE_ENV=production
PORT=8000

# AI API Keys (at least one required)
GOOGLE_API_KEY=your_production_gemini_key
OPENAI_API_KEY=your_production_openai_key

# External Services
SEARXNG_API_URL=http://searxng:8080

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,https://your-domain.com

# Logging
LOG_LEVEL=info
```

### Frontend Environment (`.env.local`)
```bash
# Production Frontend Configuration
NODE_ENV=production

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000

# Application Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### SearxNG Configuration (`settings.yml`)
```yaml
use_default_settings: true
server:
  port: 8080
  bind_address: "0.0.0.0"
  secret_key: "your-secret-key-here"
search:
  safe_search: 0
  autocomplete: "google"
engines:
  - name: google
    disabled: false
  - name: bing
    disabled: false
  - name: duckduckgo
    disabled: false
```

## Service Management

### Health Checks and Monitoring

#### Health Check Endpoints
```bash
# Backend health
curl http://localhost:8000/api/v1/health

# Frontend health (if implemented)
curl http://localhost:3000/api/health

# SearxNG health
curl http://localhost:4000/stats
```

#### Docker Health Checks
```bash
# Check container health
docker compose ps

# Detailed health status
docker inspect --format='{{.State.Health.Status}}' aisearch_backend
```

### Logging and Debugging

#### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f searxng

# Last N lines
docker compose logs --tail=100 backend
```

#### Debug Container
```bash
# Execute into running container
docker compose exec backend sh
docker compose exec frontend sh

# Run one-off container
docker compose run --rm backend sh
```

### Performance Optimization

#### Resource Limits
```yaml
# Add to docker-compose.prod.yml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

#### Volume Optimization
```yaml
# Cache node_modules for faster builds
volumes:
  node_modules_cache:
  backend_node_modules:
  frontend_node_modules:
```

## Production Deployment Strategies

### 1. Single Server Deployment
```bash
# Basic production deployment
./scripts/start.sh --docker
```

### 2. Load Balanced Deployment
```yaml
# docker-compose.scale.yml
services:
  backend:
    deploy:
      replicas: 3
  
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    depends_on:
      - backend
```

### 3. CI/CD Integration
```bash
# Example GitHub Actions workflow
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        run: |
          docker compose -f docker-compose.prod.yml build
          docker compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Common Issues

#### Port Conflicts
```bash
# Check port usage
lsof -i :3000
lsof -i :8000
lsof -i :4000

# Stop conflicting processes
./scripts/stop.sh
```

#### Build Failures
```bash
# Clean Docker cache
docker system prune -f
docker compose down -v

# Rebuild from scratch
docker compose build --no-cache
```

#### Container Communication
```bash
# Check network connectivity
docker compose exec backend ping searxng
docker compose exec frontend ping backend

# Inspect network
docker network ls
docker network inspect aisearch_default
```

#### Memory Issues
```bash
# Monitor resource usage
docker stats

# Increase Docker memory limit
# Docker Desktop > Settings > Resources > Memory
```

### Performance Monitoring

#### Container Metrics
```bash
# Real-time stats
docker stats

# Specific container
docker stats aisearch_backend

# Export metrics
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

#### Application Metrics
```bash
# Backend metrics
curl http://localhost:8000/api/v1/metrics

# Response time testing
time curl http://localhost:8000/api/v1/health
```

## Security Considerations

### Container Security
- Use non-root users in containers
- Scan images for vulnerabilities
- Keep base images updated
- Limit container capabilities

### Network Security
- Use internal networks for service communication
- Expose only necessary ports
- Implement proper CORS configuration
- Use HTTPS in production

### Environment Security
- Store secrets in environment variables
- Use Docker secrets for sensitive data
- Implement proper access controls
- Regular security updates

This comprehensive Docker guide provides everything needed to deploy and manage AiSearch in containerized environments, from development to production.